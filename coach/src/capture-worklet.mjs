import { pcm16 } from "./pcm.mjs";
class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(4000);
    this.offset = 0;
    this.port.onmessage = (event) => {
      if (event.data === "flush") {
        if (this.offset) {
          let sum = 0;
          for (const value of this.buffer.subarray(0, this.offset)) sum += value * value;
          const bytes = pcm16(this.buffer.subarray(0, this.offset));
          this.port.postMessage({ bytes, level: Math.sqrt(sum / this.offset) }, [bytes.buffer]);
          this.offset = 0;
        }
        this.port.postMessage({ flushed: true });
      }
    };
  }
  process(inputs) {
    const channels = inputs[0];
    if (!channels?.[0]) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let sample = 0;
      for (const channel of channels) sample += channel[i] / channels.length;
      this.buffer[this.offset++] = sample;
      if (this.offset === this.buffer.length) {
        let sum = 0;
        for (const value of this.buffer) sum += value * value;
        const bytes = pcm16(this.buffer);
        this.port.postMessage({ bytes, level: Math.sqrt(sum / this.buffer.length) }, [
          bytes.buffer,
        ]);
        this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor("capture", Capture);
