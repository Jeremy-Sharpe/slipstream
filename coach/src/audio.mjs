function base64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
export class AudioCapture {
  constructor({ mode, token, onTurn, onLevel, onError, onRecording, clock }) {
    Object.assign(this, { mode, token, onTurn, onLevel, onError, onRecording, clock });
    this.streams = [];
    this.sockets = [];
    this.nodes = [];
    this.stopped = true;
    this.failure = null;
  }
  async start() {
    this.stopped = false;
    this.stopping = false;
    this.failure = null;
    try {
      if (this.mode !== "system")
        this.streams.push({
          channel: "mic",
          stream: await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: false,
          }),
        });
      if (this.mode !== "mic") {
        const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
        if (!stream.getAudioTracks().length) {
          stream.getTracks().forEach((t) => t.stop());
          throw new Error(
            "No system audio received. Enable system audio recording in macOS Settings.",
          );
        }
        this.streams.push({ channel: "system", stream });
      }
      this.context = new AudioContext({ sampleRate: 16000 });
      if (this.context.sampleRate !== 16000)
        throw new Error("This audio device does not support 16 kHz capture");
      await this.context.audioWorklet.addModule("./capture-worklet.mjs");
      const mixer = this.context.createGain();
      mixer.gain.value = this.mode === "both" ? 0.5 : 1;
      const recording = new AudioWorkletNode(this.context, "capture");
      recording.port.onmessage = (event) => {
        if (!this.stopped && event.data.bytes) this.onRecording(event.data.bytes);
      };
      mixer.connect(recording);
      recording.connect(this.context.destination);
      this.nodes.push(mixer, recording);
      const results = await Promise.allSettled(
        this.streams.map(async ({ channel, stream }) => {
          for (const track of stream.getAudioTracks())
            track.onended = () => {
              if (!this.stopped && !this.stopping)
                this.fail("Audio device disconnected. Pause and reconnect it.");
            };
          const source = this.context.createMediaStreamSource(
            new MediaStream(stream.getAudioTracks()),
          );
          source.connect(mixer);
          const capture = new AudioWorkletNode(this.context, "capture");
          source.connect(capture);
          capture.connect(this.context.destination);
          this.nodes.push(source, capture);
          const connection = await this.token();
          const url = new URL(connection.websocket_url);
          url.searchParams.set("model_id", connection.model_id);
          url.searchParams.set("token", connection.token);
          url.searchParams.set("audio_format", "pcm_16000");
          url.searchParams.set("commit_strategy", "vad");
          url.searchParams.set("include_timestamps", "true");
          const socket = new WebSocket(url);
          this.sockets.push(socket);
          const offset = this.clock();
          let lastEnd = offset;
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              socket.close();
              reject(new Error("Transcription connection timed out"));
            }, 10000);
            socket.onopen = () => {
              clearTimeout(timeout);
              resolve();
            };
            socket.onerror = () => {
              clearTimeout(timeout);
              reject(new Error("Could not connect to transcription"));
            };
          });
          socket.onmessage = (event) => {
            let data;
            try {
              data = JSON.parse(event.data);
            } catch {
              return;
            }
            if (data.message_type === "partial_transcript")
              socket.pendingText = Boolean(data.text?.trim());
            if (data.message_type === "committed_transcript_with_timestamps" && data.text?.trim()) {
              const words = data.words || [];
              const start = words.length ? offset + Math.round(words[0].start * 1000) : lastEnd;
              const end = words.length
                ? offset + Math.round(words.at(-1).end * 1000)
                : this.clock();
              const role =
                this.mode === "both" ? (channel === "mic" ? "rep" : "prospect") : "unknown";
              this.onTurn({
                role,
                text: data.text.trim(),
                start_ms: Math.max(0, start),
                end_ms: Math.max(start, end),
              });
              lastEnd = Math.max(start, end);
              socket.pendingText = false;
              socket.awaitingSpeech = false;
              socket.flushDone?.();
            }
            if (data.message_type?.includes("error"))
              this.fail("Transcription error. Pause and retry the connection.");
          };
          socket.onclose = () => {
            if (!this.stopped && !this.stopping)
              this.fail("Transcription disconnected. Pause and reconnect to continue.");
          };
          capture.port.onmessage = (event) => {
            if (this.stopped || !event.data.bytes) return;
            this.onLevel(channel, event.data.level);
            if (event.data.level > 0.0005) socket.awaitingSpeech = true;
            if (socket.readyState === WebSocket.OPEN && socket.bufferedAmount < 64000)
              socket.send(
                JSON.stringify({
                  message_type: "input_audio_chunk",
                  audio_base_64: base64(event.data.bytes),
                  sample_rate: 16000,
                }),
              );
            else
              this.fail("Transcription is falling behind. Capture paused to avoid losing speech.");
          };
        }),
      );
      const failed = results.find((result) => result.status === "rejected");
      if (failed) throw failed.reason;
      if (this.failure) throw this.failure;
      await this.context.resume();
    } catch (error) {
      await this.stop();
      throw error;
    }
  }
  fail(message) {
    this.failure = new Error(message);
    this.onError(message);
  }
  async stop() {
    if (this.stopped) return;
    this.stopping = true;
    this.streams.forEach(({ stream }) => stream.getTracks().forEach((track) => track.stop()));
    this.streams = [];
    if (this.context?.state === "running") await this.context.suspend();
    const worklets = this.nodes.filter((node) => node instanceof AudioWorkletNode);
    await Promise.all(
      worklets.map(
        (node) =>
          new Promise((resolve) => {
            const listener = (event) => {
              if (event.data.flushed) {
                clearTimeout(timer);
                node.port.removeEventListener("message", listener);
                resolve();
              }
            };
            const timer = setTimeout(() => {
              node.port.removeEventListener("message", listener);
              resolve();
            }, 1000);
            node.port.addEventListener("message", listener);
            node.port.postMessage("flush");
          }),
      ),
    );
    await Promise.all(
      this.sockets.map(
        (socket) =>
          new Promise((resolve) => {
            if (socket.readyState !== WebSocket.OPEN) {
              resolve();
              return;
            }
            const timer = setTimeout(() => {
              if (socket.pendingText || socket.awaitingSpeech)
                this.fail("Final speech could not be confirmed. The local recording is retained.");
              resolve();
            }, 5000);
            socket.flushDone = () => {
              clearTimeout(timer);
              resolve();
            };
            socket.send(
              JSON.stringify({
                message_type: "input_audio_chunk",
                audio_base_64: "",
                commit: true,
                sample_rate: 16000,
              }),
            );
            if (!socket.pendingText && !socket.awaitingSpeech) setTimeout(socket.flushDone, 1200);
          }),
      ),
    );
    this.stopped = true;
    this.sockets.forEach((socket) => socket.close());
    this.sockets = [];
    this.nodes.forEach((node) => node.disconnect());
    this.nodes = [];
    if (this.context && this.context.state !== "closed") await this.context.close();
  }
}
