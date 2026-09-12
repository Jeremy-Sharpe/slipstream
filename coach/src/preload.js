const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("slipstreamCoach", {
  start: (config) => ipcRenderer.invoke("coach:start", config),
  sendTurn: (turn) => ipcRenderer.invoke("coach:turn", turn),
  stop: () => ipcRenderer.invoke("coach:stop"),
  cancel: () => ipcRenderer.invoke("coach:cancel"),
  onEvent: (listener) => {
    const handler = (_event, value) => listener(value);
    ipcRenderer.on("coach:event", handler);
    return () => ipcRenderer.removeListener("coach:event", handler);
  },
  minimize: () => ipcRenderer.invoke("window:minimize"),
  close: () => ipcRenderer.invoke("window:close"),
});
