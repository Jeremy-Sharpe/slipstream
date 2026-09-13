const { contextBridge, ipcRenderer } = require("electron");
const invoke =
  (name) =>
  (...args) =>
    ipcRenderer.invoke(name, ...args);
contextBridge.exposeInMainWorld("coach", {
  initial: invoke("initial"),
  launch: invoke("launch"),
  settings: invoke("settings"),
  token: invoke("token"),
  checkpoint: invoke("checkpoint"),
  captureStatus: invoke("capture-status"),
  window: invoke("window"),
  recording: invoke("recording"),
  upload: invoke("upload"),
  finish: invoke("finish"),
  review: invoke("review"),
  export: invoke("export"),
  on: (name, callback) => {
    if (!["session", "error", "end-requested", "pause-requested"].includes(name)) return;
    const listener = (_, value) => callback(value);
    ipcRenderer.on(name, listener);
    return () => ipcRenderer.removeListener(name, listener);
  },
});
