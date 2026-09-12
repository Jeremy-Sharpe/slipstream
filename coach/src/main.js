if (require("electron-squirrel-startup")) process.exit(0);

const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { app, BrowserWindow, ipcMain, session: electronSession } = require("electron");
const { CoachSession } = require("./session");

let window;
const coachSession = new CoachSession();
const appDocument = pathToFileURL(path.join(__dirname, "index.html")).href;

function trustedSender(event) {
  return Boolean(window && !window.isDestroyed()
    && event.sender === window.webContents
    && event.senderFrame === window.webContents.mainFrame
    && event.senderFrame.url === appDocument);
}

function trustedHandle(handler) {
  return (event, ...args) => {
    if (!trustedSender(event)) throw new Error("Untrusted IPC sender");
    return handler(...args);
  };
}

function createWindow() {
  window = new BrowserWindow({
    width: 440,
    height: 720,
    minWidth: 380,
    minHeight: 560,
    alwaysOnTop: true,
    transparent: true,
    frame: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== appDocument) event.preventDefault();
  });
  window.webContents.on("did-start-navigation", (_event, _url, _inPlace, isMainFrame) => {
    if (isMainFrame) coachSession.close();
  });
  window.webContents.on("render-process-gone", () => coachSession.close());
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  window.loadURL(appDocument);
}

app.whenReady().then(() => {
  const trustedWebContents = (webContents) => Boolean(window && webContents === window.webContents && webContents.getURL() === appDocument);
  const permissionRequestAllowed = (webContents, permission, details = {}) => {
    const audioOnly = permission === "media" && details.mediaTypes?.includes("audio") && !details.mediaTypes?.includes("video");
    return Boolean(trustedWebContents(webContents) && audioOnly);
  };
  electronSession.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    callback(permissionRequestAllowed(webContents, permission, details));
  });
  electronSession.defaultSession.setPermissionCheckHandler((webContents, permission, _origin, details) => (
    Boolean(trustedWebContents(webContents)
      && permission === "media"
      && details.mediaType === "audio"
      && details.isMainFrame
      && details.requestingUrl === appDocument)
  ));
  createWindow();
  coachSession.on("event", (event) => {
    if (window && !window.isDestroyed()) window.webContents.send("coach:event", event);
  });
  ipcMain.handle("coach:start", trustedHandle((config) => coachSession.start(config)));
  ipcMain.handle("coach:turn", trustedHandle((turn) => coachSession.sendTurn(turn)));
  ipcMain.handle("coach:stop", trustedHandle(() => coachSession.stop()));
  ipcMain.handle("coach:cancel", trustedHandle(() => coachSession.close()));
  ipcMain.handle("window:minimize", trustedHandle(() => window?.minimize()));
  ipcMain.handle("window:close", trustedHandle(() => app.quit()));
});

app.on("before-quit", () => coachSession.close());
app.on("window-all-closed", () => app.quit());
