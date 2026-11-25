/* Local accounts and session for the admin console.
   Demo-only: credentials are stored in this browser and never leave it. */

const USERS_KEY = "spiceroute.users.v1";
const SESSION_KEY = "spiceroute.session.v1";

export const DEMO_ACCOUNT = Object.freeze({
  name: "Ava Reyes",
  email: "admin@spiceroute.ph",
  password: "admin123",
});

function readUsers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function hashPassword(password) {
  const bytes = new TextEncoder().encode(`spiceroute::${password}`);
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }
  let hash = 5381;
  for (const byte of bytes) hash = ((hash * 33) ^ byte) >>> 0;
  return `fallback:${hash.toString(16)}`;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    avatar: user.avatar || "",
  };
}

function startSession(userId) {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ userId, signedInAt: new Date().toISOString() })
    );
  } catch {
    /* storage unavailable — session stays in memory only */
  }
}

/** Create the sample administrator on first run so the demo can be opened. */
export async function ensureDemoAccount() {
  const users = readUsers();
  if (users.some((user) => user.email === DEMO_ACCOUNT.email)) return;

  users.push({
    id: "usr_demo",
    name: DEMO_ACCOUNT.name,
    email: DEMO_ACCOUNT.email,
    passwordHash: await hashPassword(DEMO_ACCOUNT.password),
    createdAt: new Date().toISOString(),
    demo: true,
  });
  writeUsers(users);
}

export function currentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { userId } = JSON.parse(raw);
    return publicUser(readUsers().find((user) => user.id === userId));
  } catch {
    return null;
  }
}

export async function register({ name, email, password }) {
  const cleanName = String(name || "").trim();
  const mail = normalizeEmail(email);

  if (cleanName.length < 2) return { ok: false, error: "Enter your full name.", field: "name" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    return { ok: false, error: "Enter a valid email address.", field: "email" };
  }
  if (String(password || "").length < 8) {
    return { ok: false, error: "Use at least 8 characters for your password.", field: "password" };
  }

  const users = readUsers();
  if (users.some((user) => user.email === mail)) {
    return { ok: false, error: "An account with this email already exists.", field: "email" };
  }

  const user = {
    id: `usr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    email: mail,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeUsers(users);
  // No session switch: admins are added from Settings while someone is signed in.
  return { ok: true, user: publicUser(user) };
}

export async function login({ email, password }) {
  const mail = normalizeEmail(email);
  const user = readUsers().find((item) => item.email === mail);

  if (!user) return { ok: false, error: "Incorrect email or password." };

  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) return { ok: false, error: "Incorrect email or password." };

  startSession(user.id);
  return { ok: true, user: publicUser(user) };
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function accountCount() {
  return readUsers().length;
}

/** Admin accounts, used by Settings → Admin accounts. */
export function listAdmins() {
  return readUsers().map((user) => ({ ...publicUser(user), demo: Boolean(user.demo) }));
}

/** Save (or clear) the profile photo of one admin account. */
export function setAvatar(id, avatar) {
  const users = readUsers();
  const user = users.find((item) => item.id === id);
  if (!user) return { ok: false, error: "That admin account no longer exists." };

  const value = typeof avatar === "string" ? avatar : "";
  if (value && !/^data:image\/(png|jpeg|webp);base64,/.test(value)) {
    return { ok: false, error: "Use a JPG, PNG or WebP image." };
  }
  if (value.length > 400000) {
    return { ok: false, error: "That photo is too large. Try a smaller image." };
  }

  if (value) user.avatar = value;
  else delete user.avatar;

  try {
    writeUsers(users);
  } catch {
    return { ok: false, error: "This browser's storage is full — the photo wasn't saved." };
  }
  return { ok: true, user: publicUser(user) };
}

export function removeAdmin(id) {
  const users = readUsers();
  if (!users.some((user) => user.id === id)) {
    return { ok: false, error: "That admin account no longer exists." };
  }
  if (users.length <= 1) {
    return { ok: false, error: "Keep at least one admin account." };
  }
  writeUsers(users.filter((user) => user.id !== id));
  return { ok: true };
}
