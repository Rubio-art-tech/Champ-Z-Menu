/* Shared live sync for the admin console and the storefront.
   The dev server (server.py) keeps one copy of the menu and orders at
   /api/state, so both windows stay identical even across browsers. When that
   server isn't running the apps keep using this browser's storage, which still
   syncs between tabs through "storage" events. */

const STORE_KEY = "spiceroute.admin.v1";
const API = "/api/state";
const POLL_MS = 1500;
const PUSH_DELAY = 120;

const listeners = new Set();
let version = null;
let knownJson = null;
let started = false;
let pollTimer = null;
let pushTimer = null;

const canSync = () => location.protocol === "http:" || location.protocol === "https:";

/** Run a callback whenever data written elsewhere has been adopted. */
export function onSync(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn("A live-sync listener failed.", error);
    }
  });
}

function readLocal() {
  try {
    return localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

/** Write a state that came from the server; true when this window changed. */
function adopt(json) {
  knownJson = json;
  if (!json || readLocal() === json) return false;
  try {
    localStorage.setItem(STORE_KEY, json);
  } catch {
    return false;
  }
  return true;
}

async function request(method, body) {
  const response = await fetch(API, {
    method,
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`Sync server responded ${response.status}`);
  return response.json();
}

async function pushNow(json) {
  try {
    const state = await request("PUT", { data: JSON.parse(json) });
    if (!state || typeof state.version !== "number") return;
    version = state.version;
    const accepted = JSON.stringify(state.data);
    // The server keeps orders it already had, so re-adopt when it answered with more.
    if (accepted !== json && adopt(accepted)) notify();
    else knownJson = accepted;
  } catch {
    /* Static hosting or offline: this browser's copy stays authoritative. */
  }
}

/** Called by the store after every save so the other window sees it at once. */
export function pushState(json) {
  if (!canSync() || typeof json !== "string") return;
  knownJson = json;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => pushNow(json), PUSH_DELAY);
}

async function poll() {
  if (!canSync()) return;
  try {
    const state = await request("GET");
    if (!state || typeof state.version !== "number") return;
    if (state.version === version) return;
    version = state.version;

    if (!state.data) {
      // Nothing saved yet: seed the shared copy from this window.
      const local = readLocal();
      if (local) await pushNow(local);
      return;
    }

    if (adopt(JSON.stringify(state.data))) notify();
  } catch {
    /* No sync server reachable — same-browser storage still works. */
  }
}

export function startSync() {
  if (started || !canSync()) return;
  started = true;
  poll();
  pollTimer = window.setInterval(poll, POLL_MS);
  // Background tabs get their timers throttled, so catch up on return.
  window.addEventListener("focus", poll);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) poll();
  });
  window.addEventListener("pagehide", () => window.clearInterval(pollTimer));
}
