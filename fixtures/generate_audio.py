from __future__ import annotations

import argparse
import json
import os
import subprocess
import tempfile
import urllib.error
import urllib.request
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from schema import CallScript, Seller


ROOT = Path(__file__).parent
CALLS_DIR = ROOT / "calls"
SELLER_PATH = ROOT / "seller.json"
API_URL = "https://api.elevenlabs.io/v1/text-to-dialogue"
VOICE_LIST_URL = "https://api.elevenlabs.io/v1/voices"
MAX_CHARS = 1800
FFMPEG = "/opt/homebrew/bin/ffmpeg"


@dataclass
class DialogueChunk:
    index: int
    inputs: list[dict[str, str]]

    @property
    def character_count(self) -> int:
        return sum(len(item["text"]) for item in self.inputs)


def load_seller() -> Seller:
    return Seller.model_validate(json.loads(SELLER_PATH.read_text(encoding="utf-8")))


def load_call(call_dir: Path) -> CallScript:
    return CallScript.model_validate(json.loads((call_dir / "script.json").read_text(encoding="utf-8")))


def voice_for_turn(turn_name: str, seller: Seller) -> str:
    if turn_name in seller.voices.rep:
        return seller.voices.rep[turn_name]
    return seller.voices.prospect_overrides.get(turn_name, seller.voices.prospect_default)


def build_chunks(script: CallScript, seller: Seller, max_chars: int = MAX_CHARS) -> list[DialogueChunk]:
    chunks: list[DialogueChunk] = []
    current: list[dict[str, str]] = []
    current_chars = 0
    for turn in script.turns:
        text = f"{turn.name}: {turn.text}"
        voice_id = voice_for_turn(turn.name, seller)
        if current and current_chars + len(text) > max_chars:
            chunks.append(DialogueChunk(index=len(chunks) + 1, inputs=current))
            current = []
            current_chars = 0
        current.append({"text": text, "voice_id": voice_id})
        current_chars += len(text)
    if current:
        chunks.append(DialogueChunk(index=len(chunks) + 1, inputs=current))
    return chunks


def api_key() -> str | None:
    load_dotenv(ROOT / ".env")
    return os.environ.get("ELEVENLABS_API_KEY")


def list_voices() -> None:
    key = api_key()
    if not key:
        raise SystemExit("ELEVENLABS_API_KEY is required for --list-voices")
    request = urllib.request.Request(VOICE_LIST_URL, headers={"xi-api-key": key})
    with urllib.request.urlopen(request, timeout=60) as response:
        data = json.loads(response.read().decode("utf-8"))
    for voice in data.get("voices", []):
        print(f"{voice.get('name')}: {voice.get('voice_id')}")


def _audio_bytes(result: Any) -> bytes:
    if isinstance(result, bytes):
        return result
    if hasattr(result, "read"):
        return result.read()
    if isinstance(result, Iterable):
        return b"".join(part if isinstance(part, bytes) else bytes(part) for part in result)
    raise TypeError(f"Cannot convert SDK response {type(result)!r} to bytes")


def generate_chunk_with_sdk(inputs: list[dict[str, str]], key: str) -> bytes | None:
    try:
        from elevenlabs import ElevenLabs
    except ImportError:
        return None
    client = ElevenLabs(api_key=key)
    dialogue = getattr(client, "text_to_dialogue", None)
    if dialogue is None:
        return None
    convert = getattr(dialogue, "convert", None)
    if callable(convert):
        return _audio_bytes(convert(model_id="eleven_v3", inputs=inputs, output_format="mp3_44100_128"))
    if callable(dialogue):
        return _audio_bytes(dialogue(model_id="eleven_v3", inputs=inputs, output_format="mp3_44100_128"))
    return None


def generate_chunk_with_urllib(inputs: list[dict[str, str]], key: str) -> bytes:
    payload = json.dumps(
        {
            "model_id": "eleven_v3",
            "inputs": inputs,
            "output_format": "mp3_44100_128",
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        API_URL,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
            "xi-api-key": key,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            return response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"ElevenLabs text-to-dialogue failed: {exc.code} {detail}") from exc


def generate_chunk(inputs: list[dict[str, str]], key: str) -> bytes:
    sdk_result = generate_chunk_with_sdk(inputs, key)
    if sdk_result is not None:
        return sdk_result
    return generate_chunk_with_urllib(inputs, key)


def concatenate(chunks: list[Path], output: Path) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as handle:
        concat_path = Path(handle.name)
        for chunk in chunks:
            handle.write(f"file '{chunk.as_posix()}'\n")
    try:
        subprocess.run(
            [FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(concat_path), "-c", "copy", str(output)],
            check=True,
            capture_output=True,
            text=True,
        )
    finally:
        concat_path.unlink(missing_ok=True)


def update_audio_seconds(script_path: Path, seconds: float) -> None:
    data = json.loads(script_path.read_text(encoding="utf-8"))
    data["audio_seconds"] = round(seconds, 2)
    script_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def call_dirs(only: str | None, demo_only: bool) -> list[Path]:
    dirs = sorted(path for path in CALLS_DIR.iterdir() if path.is_dir())
    if only:
        dirs = [path for path in dirs if path.name == only]
    if demo_only:
        dirs = [path for path in dirs if load_call(path).demo]
    return dirs


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate ElevenLabs dialogue audio for Slipstream fixtures.")
    parser.add_argument("--only", help="Generate one call id only")
    parser.add_argument("--demo", action="store_true", help="Generate only calls marked demo: true")
    parser.add_argument("--dry-run", action="store_true", help="Print chunk plans without API calls")
    parser.add_argument("--force", action="store_true", help="Regenerate existing audio.mp3 files")
    parser.add_argument("--list-voices", action="store_true", help="List ElevenLabs voices for filling seller.json")
    args = parser.parse_args()

    if args.list_voices:
        list_voices()
        return 0

    seller = load_seller()
    selected_dirs = call_dirs(args.only, args.demo)
    if args.only and not selected_dirs:
        raise SystemExit(f"No call found for {args.only}")
    if args.demo and not selected_dirs:
        raise SystemExit("No demo calls found")

    key = None if args.dry_run else api_key()
    if not args.dry_run and not key:
        raise SystemExit("ELEVENLABS_API_KEY is required unless --dry-run is set")

    for call_dir in selected_dirs:
        script = load_call(call_dir)
        output = call_dir / "audio.mp3"
        if output.exists() and not args.force:
            print(f"{script.call_id}: audio.mp3 exists, skipping")
            continue
        chunks = build_chunks(script, seller)
        total_chars = sum(chunk.character_count for chunk in chunks)
        print(f"{script.call_id}: {len(chunks)} chunks, {total_chars} characters")
        for chunk in chunks:
            print(f"  chunk {chunk.index}: {len(chunk.inputs)} turns, {chunk.character_count} chars")
        if args.dry_run:
            continue
        chunk_paths: list[Path] = []
        for chunk in chunks:
            chunk_path = call_dir / f"chunk-{chunk.index:02d}.mp3"
            chunk_path.write_bytes(generate_chunk(chunk.inputs, key or ""))
            chunk_paths.append(chunk_path)
        concatenate(chunk_paths, output)
        update_audio_seconds(call_dir / "script.json", float(script.duration_target_seconds))
        print(f"{script.call_id}: wrote {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
