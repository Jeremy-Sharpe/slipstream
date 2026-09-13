import test from "node:test";
import assert from "node:assert/strict";
import { AudioCapture } from "../src/audio.mjs";
function mocks() {
  const stopped = [];
  const stream = (name) => ({
    getTracks: () => [{ stop: () => stopped.push(name) }],
    getAudioTracks: () => [{ stop: () => stopped.push(name) }],
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async () => stream("mic"),
        getDisplayMedia: async () => stream("system"),
      },
    },
  });
  globalThis.MediaStream = class {
    constructor(tracks) {
      this.tracks = tracks;
    }
  };
  const sockets = [];
  globalThis.WebSocket = class {
    static OPEN = 1;
    constructor() {
      this.readyState = 0;
      this.bufferedAmount = 0;
      sockets.push(this);
      setTimeout(() => {
        this.readyState = 1;
        this.onopen?.();
      }, 1);
    }
    close() {
      this.readyState = 3;
      this.onclose?.();
    }
    send() {}
  };
  globalThis.AudioWorkletNode = class {
    constructor() {
      this.port = {
        onmessage: null,
        postMessage: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    }
    connect() {}
    disconnect() {}
  };
  globalThis.AudioContext = class {
    constructor() {
      this.sampleRate = 16000;
      this.state = "running";
      this.audioWorklet = { addModule: async () => {} };
      this.destination = {};
    }
    createGain() {
      return { gain: {}, connect() {}, disconnect() {} };
    }
    createMediaStreamSource() {
      return { connect() {}, disconnect() {} };
    }
    async resume() {}
    async suspend() {
      this.state = "suspended";
    }
    async close() {
      this.state = "closed";
    }
  };
  return { sockets, stopped };
}
test("Failure of one audio channel waits for the other before cleaning every socket", async () => {
  const { sockets, stopped } = mocks();
  let calls = 0;
  const audio = new AudioCapture({
    mode: "both",
    token: async () => {
      if (++calls === 1) throw new Error("Token rejected");
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { websocket_url: "wss://example.test", model_id: "test", token: "scoped" };
    },
    onTurn() {},
    onLevel() {},
    onError() {},
    onRecording() {},
    clock: () => 0,
  });
  await assert.rejects(audio.start(), /Token rejected/);
  assert.equal(audio.context.state, "closed");
  assert.equal(sockets.length, 1);
  assert.equal(sockets[0].readyState, 3);
  assert.ok(stopped.includes("mic") && stopped.includes("system"));
});
