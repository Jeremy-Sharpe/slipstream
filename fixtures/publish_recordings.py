# /// script
# requires-python = ">=3.12"
# dependencies = ["kokoro-onnx==0.4.9", "soundfile>=0.12", "numpy>=1.26"]
# ///
"""Publish the judge-facing call recordings the web app serves from public/recordings.

A call with an ElevenLabs master (fixtures/calls/<id>/audio.mp3, from generate_audio.py)
is transcoded as is. A call without one is voiced locally with the open-weight
Kokoro-82M model, one voice per speaker, and its measured length is written back to
script.json as audio_seconds so transcript timings match what judges hear.

    uv run --script publish_recordings.py --models ~/kokoro   # kokoro-v1.0.onnx + voices-v1.0.bin
"""

from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).parent
REPO = ROOT.parent
CALLS_DIR = ROOT / "calls"
PUBLIC_DIR = REPO / "public" / "recordings"
MANIFEST = REPO / "lib" / "data" / "recordings.json"
FFMPEG = "ffmpeg"
BITRATE = "64k"
SAMPLE_RATE = 24_000

# One per outcome the picker shows, plus the voiced demo call.
CALLS = [
    "call-13-marlowe-finch-demo",
    "call-07-fairfield-wealth",
    "call-04-kite-and-co",
    "call-03-afterglow-studio",
    "call-12-dockside-dental",
]

# Kokoro voices by speaker name. Reps keep the same voice across calls.
VOICES = {
    "Sam Whitfield": "bm_george",
    "Jordan Lee": "am_michael",
    "Olivia Hart": "bf_emma",
    "Daniel Ortiz": "am_fenrir",
    "Priya Shah": "af_heart",
    "Reception": "af_bella",
}
LANG = {"b": "en-gb", "a": "en-us"}
SPEED = 1.05
TURN_GAP_SECONDS = 0.35


def encode(source: Path, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [FFMPEG, "-y", "-v", "error", "-i", str(source), "-ac", "1", "-ar", str(SAMPLE_RATE), "-b:a", BITRATE, str(output)],
        check=True,
    )


def seconds(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return round(float(result.stdout.strip()), 2)


def voice_locally(script: dict, models: Path, output: Path) -> list[str]:
    import numpy as np
    import soundfile as sf
    from kokoro_onnx import Kokoro

    kokoro = Kokoro(str(models / "kokoro-v1.0.onnx"), str(models / "voices-v1.0.bin"))
    gap = np.zeros(int(SAMPLE_RATE * TURN_GAP_SECONDS), dtype=np.float32)
    pieces = []
    for turn in script["turns"]:
        voice = VOICES[turn["name"]]
        samples, rate = kokoro.create(turn["text"], voice=voice, speed=SPEED, lang=LANG[voice[0]])
        if rate != SAMPLE_RATE:
            raise RuntimeError(f"Unexpected Kokoro sample rate {rate}")
        pieces.extend([samples.astype(np.float32), gap])
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "call.wav"
        sf.write(wav, np.concatenate(pieces[:-1]), SAMPLE_RATE)
        encode(wav, output)
    return sorted({f"{turn['name']}: Kokoro {VOICES[turn['name']]}" for turn in script["turns"]})


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--models", type=Path, help="Directory holding kokoro-v1.0.onnx and voices-v1.0.bin")
    parser.add_argument("--only", help="Publish one call id only")
    args = parser.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    for call_id in [c for c in CALLS if not args.only or c == args.only]:
        script_path = CALLS_DIR / call_id / "script.json"
        script = json.loads(script_path.read_text(encoding="utf-8"))
        output = PUBLIC_DIR / f"{call_id}.mp3"
        master = CALLS_DIR / call_id / "audio.mp3"
        if master.is_file():
            encode(master, output)
            voices = "ElevenLabs eleven_v3 text-to-dialogue"
        else:
            if args.models is None:
                raise SystemExit(f"{call_id} has no ElevenLabs master; pass --models to voice it locally")
            voices = "Kokoro-82M (local): " + ", ".join(voice_locally(script, args.models.expanduser(), output))
            script["audio_seconds"] = seconds(output)
            script_path.write_text(json.dumps(script, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        manifest[call_id] = {
            "src": f"/recordings/{call_id}.mp3",
            "seconds": seconds(output),
            "voices": voices,
        }
        print(f"{call_id}: {manifest[call_id]['seconds']}s, {output.stat().st_size / 1_000_000:.2f} MB, {voices}")
    MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
