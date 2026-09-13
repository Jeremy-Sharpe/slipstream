function visibleBounds(saved, displays) {
  const display =
    displays.find(
      (d) =>
        saved &&
        saved.x >= d.x &&
        saved.y >= d.y &&
        saved.x < d.x + d.width &&
        saved.y < d.y + d.height,
    ) || displays[0];
  const width = Math.min(display.width, Math.max(300, saved?.width || 360));
  const height = Math.min(display.height, Math.max(220, saved?.height || 420));
  return {
    width,
    height,
    x: Math.max(
      display.x,
      Math.min(
        saved?.x ?? display.x + display.width - width - 20,
        display.x + display.width - width,
      ),
    ),
    y: Math.max(
      display.y,
      Math.min(saved?.y ?? display.y + 28, display.y + display.height - height),
    ),
  };
}
function parseLaunch(value) {
  const url = new URL(value);
  const id = url.searchParams.get("session");
  const token = url.searchParams.get("token");
  if (
    url.protocol !== "slipstream:" ||
    url.hostname !== "coach" ||
    !/^[a-f0-9-]{36}$/i.test(id || "") ||
    !/^[A-Za-z0-9_-]{32,100}$/.test(token || "")
  )
    throw new Error("Invalid Slipstream launch link");
  return { id, handoff: token };
}
function origin(value) {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))
  )
    throw new Error("Use an HTTPS origin or local development address");
  return url.origin;
}
module.exports = { visibleBounds, parseLaunch, origin };
