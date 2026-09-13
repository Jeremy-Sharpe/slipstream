const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  desktopCapturer,
  screen,
  globalShortcut,
  shell,
  safeStorage,
  dialog,
  Tray,
  Menu,
  nativeImage,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const { visibleBounds, parseLaunch, origin } = require("./window.cjs");
if (process.env.SLIPSTREAM_DATA_DIR) {
  fs.mkdirSync(process.env.SLIPSTREAM_DATA_DIR, { recursive: true });
  app.setPath("userData", process.env.SLIPSTREAM_DATA_DIR);
}
let win,
  tray,
  current = null,
  pendingAttempt = null,
  settings,
  recordingBytes = 0;
let capturing = false,
  pendingLink = process.argv.find((arg) => arg.startsWith("slipstream://"));
const local = (name) => path.join(app.getPath("userData"), name);
function read(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(local(name), "utf8"));
  } catch {
    return fallback;
  }
}
function write(name, value) {
  fs.writeFileSync(local(name), JSON.stringify(value), { mode: 0o600 });
}
function persist() {
  if (safeStorage.isEncryptionAvailable() && current)
    write("session.json", {
      encrypted: safeStorage.encryptString(JSON.stringify(current)).toString("base64"),
    });
}
function ensureSession(id) {
  if (!current || current.id !== id) throw new Error("Session mismatch");
}
async function request(route, options = {}) {
  const response = await fetch(settings.api + "/api/v1/coach/" + route, {
    ...options,
    signal: AbortSignal.timeout(options.body instanceof Uint8Array ? 190000 : 15000),
    headers: {
      "Content-Type": "application/json",
      ...(current?.access ? { Authorization: "Bearer " + current.access } : {}),
      ...options.headers,
    },
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("The coach API returned an invalid response");
  }
  if (!response.ok) {
    const error = new Error(
      typeof body.detail === "string" ? body.detail : "Coach API request failed",
    );
    error.status = response.status;
    throw error;
  }
  return body;
}
async function launch(value) {
  const next = parseLaunch(value);
  if (current && current.id !== next.id && current.status !== "ended")
    throw new Error("End the current call before opening another customer");
  const candidate =
    current?.id === next.id
      ? current
      : pendingAttempt?.id === next.id && pendingAttempt.handoff === next.handoff
        ? pendingAttempt
        : {
            ...next,
            access: randomBytes(32).toString("base64url"),
            turns: [],
            actions: [],
            status: "ready",
          };
  pendingAttempt = candidate;
  if (safeStorage.isEncryptionAvailable())
    write("pending.json", {
      encrypted: safeStorage.encryptString(JSON.stringify(candidate)).toString("base64"),
    });
  const result = await request(`sessions/${candidate.id}/redeem`, {
    method: "POST",
    body: JSON.stringify({ token: candidate.handoff, access_token: candidate.access }),
  });
  current = { ...candidate, status: result.status };
  pendingAttempt = null;
  persist();
  fs.rmSync(local("pending.json"), { force: true });
  win.webContents.send("session", { ...current, session: result, settings });
  win.show();
  return { ...current, session: result, settings };
}
const singleton = app.requestSingleInstanceLock();
if (!singleton) app.quit();
else {
  app.on("open-url", (event, url) => {
    event.preventDefault();
    if (win) launch(url).catch(showError);
    else pendingLink = url;
  });
  app.on("second-instance", (_, args) => {
    const url = args.find((v) => v.startsWith("slipstream://"));
    if (url) launch(url).catch(showError);
    else win?.show();
  });
  app.whenReady().then(() => {
    settings = read("settings.json", {
      api: process.env.COACH_API_URL || "http://localhost:8000",
      web: process.env.COACH_WEB_URL || "http://localhost:3000",
    });
    settings = { api: origin(settings.api), web: origin(settings.web) };
    try {
      const saved = read("session.json", {});
      if (saved.encrypted && safeStorage.isEncryptionAvailable())
        current = JSON.parse(safeStorage.decryptString(Buffer.from(saved.encrypted, "base64")));
    } catch {
      current = null;
    }
    try {
      const saved = read("pending.json", {});
      if (saved.encrypted && safeStorage.isEncryptionAvailable())
        pendingAttempt = JSON.parse(
          safeStorage.decryptString(Buffer.from(saved.encrypted, "base64")),
        );
    } catch {
      pendingAttempt = null;
    }
    const area = () => screen.getAllDisplays().map((d) => d.workArea);
    win = new BrowserWindow({
      ...visibleBounds(read("bounds.json", null), area()),
      minWidth: 300,
      minHeight: 220,
      frame: false,
      resizable: true,
      alwaysOnTop: true,
      backgroundColor: "#eef4f2",
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });
    win.setAlwaysOnTop(true, "floating");
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (event) => event.preventDefault());
    session.defaultSession.setPermissionRequestHandler((wc, permission, callback) =>
      callback(wc === win.webContents && ["media", "display-capture"].includes(permission)),
    );
    session.defaultSession.setDisplayMediaRequestHandler(
      async (_, callback) => {
        try {
          const sources = await desktopCapturer.getSources({
            types: ["screen"],
            thumbnailSize: { width: 0, height: 0 },
          });
          callback({ video: sources[0], audio: "loopback" });
        } catch {
          callback({});
        }
      },
      { useSystemPicker: true },
    );
    win.loadFile(path.join(__dirname, "index.html"));
    win.once("ready-to-show", () => {
      win.showInactive();
      if (pendingLink) launch(pendingLink).catch(showError);
    });
    let timer;
    const saveBounds = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!win.isDestroyed()) write("bounds.json", win.getBounds());
      }, 300);
    };
    win.on("moved", saveBounds);
    win.on("resized", saveBounds);
    screen.on("display-removed", () => win.setBounds(visibleBounds(win.getBounds(), area())));
    screen.on("display-metrics-changed", () =>
      win.setBounds(visibleBounds(win.getBounds(), area())),
    );
    win.on("close", (event) => {
      if (capturing || (current && current.status !== "ended")) {
        event.preventDefault();
        win.webContents.send("end-requested");
      }
    });
    globalShortcut.register("CommandOrControl+Shift+Space", () => {
      win.setIgnoreMouseEvents(false);
      win.isVisible() ? win.hide() : win.showInactive();
    });
    globalShortcut.register("CommandOrControl+Shift+P", () =>
      win.webContents.send("pause-requested"),
    );
    const icon = nativeImage.createFromDataURL(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
    );
    tray = new Tray(icon);
    tray.setTitle("S");
    tray.setToolTip("Slipstream Coach");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Show coach", click: () => win.showInactive() },
        { label: "Pause / resume", click: () => win.webContents.send("pause-requested") },
        {
          label: "End call",
          click: () => {
            win.show();
            win.webContents.send("end-requested");
          },
        },
        {
          label: "Quit",
          click: () => {
            if (capturing || (current && current.status !== "ended")) {
              win.show();
              win.webContents.send("end-requested");
            } else app.quit();
          },
        },
      ]),
    );
    if (app.isPackaged) app.setAsDefaultProtocolClient("slipstream");
    else
      app.setAsDefaultProtocolClient("slipstream", process.execPath, [
        path.resolve(__dirname, ".."),
      ]);
  });
}
function showError(error) {
  win?.webContents.send("error", error.message);
}
function handle(name, fn) {
  ipcMain.handle(name, (event, ...args) => {
    if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame)
      throw new Error("Invalid sender");
    return fn(...args);
  });
}
handle("initial", () => ({
  current,
  settings,
  secureStorage: safeStorage.isEncryptionAvailable(),
}));
handle("launch", (value) => launch(value));
handle("settings", (value) => {
  if (current && current.status !== "ended")
    throw new Error("End the current session before changing servers");
  settings = { api: origin(value.api), web: origin(value.web) };
  write("settings.json", settings);
  return settings;
});
handle("token", () => request(`sessions/${current.id}/scribe-token`, { method: "POST" }));
handle("checkpoint", (value) => {
  ensureSession(value.id);
  if (JSON.stringify(value).length > 700000) throw new Error("Transcript storage limit reached");
  current.turns = value.turns;
  current.actions = value.actions;
  current.status = value.status;
  persist();
});
handle("capture-status", (active) => {
  capturing = Boolean(active);
  tray?.setTitle(capturing ? "S •" : "S");
});
handle("window", (action) => {
  if (action === "reset") win.setBounds(visibleBounds(null, [screen.getPrimaryDisplay().workArea]));
  if (action === "collapse") {
    win.setMinimumSize(300, 96);
    win.setSize(win.getBounds().width, 96);
  }
  if (action === "expand") {
    win.setMinimumSize(300, 220);
    win.setSize(win.getBounds().width, 420);
  }
  if (action === "grow")
    win.setBounds(
      visibleBounds(
        {
          ...win.getBounds(),
          width: win.getBounds().width + 40,
          height: win.getBounds().height + 40,
        },
        screen.getAllDisplays().map((d) => d.workArea),
      ),
    );
  if (action === "shrink")
    win.setBounds(
      visibleBounds(
        {
          ...win.getBounds(),
          width: win.getBounds().width - 40,
          height: win.getBounds().height - 40,
        },
        screen.getAllDisplays().map((d) => d.workArea),
      ),
    );
});
handle("recording", (id, chunk) => {
  ensureSession(id);
  if (!(chunk instanceof Uint8Array) || chunk.length > 2 * 1024 * 1024)
    throw new Error("Invalid recording chunk");
  const filename = local(id + ".pcm");
  const existing = fs.existsSync(filename) ? fs.statSync(filename).size : 0;
  recordingBytes = existing + chunk.length;
  // The API accepts recordings up to 50 MB; past that, coaching continues from the live transcript.
  if (recordingBytes > 50 * 1024 * 1024 - 44) return { limited: true };
  fs.appendFileSync(filename, Buffer.from(chunk), { mode: 0o600 });
  return { limited: false };
});
async function recordingFile(filename) {
  const { wavHeader } = await import("./pcm.mjs");
  const pcm = fs.readFileSync(filename);
  return new Uint8Array(Buffer.concat([Buffer.from(wavHeader(pcm.length)), pcm]));
}
// 401 or 404 means the server no longer has this session (API restart or expired access).
const sessionMissing = (error) => error.status === 401 || error.status === 404;
handle("upload", async () => {
  const filename = local(current.id + ".pcm");
  if (!fs.existsSync(filename)) return { status: "not_recorded" };
  try {
    return await request(`sessions/${current.id}/recording`, {
      method: "POST",
      headers: { "Content-Type": "audio/wav" },
      body: await recordingFile(filename),
    });
  } catch (error) {
    if (sessionMissing(error)) return { status: "session_missing" };
    throw error;
  }
});
handle("finish", async () => {
  let result;
  try {
    result = await request(`sessions/${current.id}/finish`, { method: "POST" });
  } catch (error) {
    if (!sessionMissing(error)) throw error;
    // Release the desktop so the rep can start another call; the recording stays for export.
    current.status = "ended";
    persist();
    return { orphaned: true };
  }
  current.status = "ended";
  persist();
  if (result.recording_status === "stored") fs.rmSync(local(current.id + ".pcm"), { force: true });
  return result;
});
handle("review", () => shell.openExternal(settings.web + "/coach/" + current.id));
handle("export", async () => {
  const result = await dialog.showSaveDialog(win, { defaultPath: "call-recording.wav" });
  if (result.canceled) return;
  const filename = local(current.id + ".pcm");
  if (!fs.existsSync(filename)) throw new Error("No local recording");
  fs.writeFileSync(result.filePath, await recordingFile(filename));
});
app.on("will-quit", () => globalShortcut.unregisterAll());
