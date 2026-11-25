/* App shell: hash routing, navigation, delegation and page wiring. */

import { initials } from "./format.js";
import { hydrateIcons } from "./icons.js";
import {
  currentUser,
  ensureDemoAccount,
  login,
  logout,
  register,
  removeAdmin,
  setAvatar,
} from "./auth.js";
import { bindAuthUI, loginPage } from "./auth-pages.js";
import {
  categoriesPage,
  dashboardPage,
  defaultFilters,
  productsPage,
  productsResults,
  settingsPage,
} from "./pages.js";
import { onSync, startSync } from "./live-sync.js";
import { store } from "./store.js";
import { confirmDialog, toast } from "./ui.js";
import {
  confirmDeleteCategory,
  confirmDeleteProduct,
  openCategoryForm,
  openProductForm,
} from "./forms.js";

const ROUTES = {
  dashboard: { title: "Dashboard", eyebrow: "Overview" },
  products: { title: "Product Management", eyebrow: "Menu" },
  categories: { title: "Categories", eyebrow: "Menu structure" },
  settings: { title: "Settings", eyebrow: "System" },
};

const app = document.getElementById("app");
const view = document.getElementById("view");
const authRoot = document.getElementById("authRoot");
const scrim = document.getElementById("scrim");
const globalSearch = document.getElementById("globalSearch");
const globalSearchInput = document.getElementById("globalSearchInput");

let filters = defaultFilters();
let activeRoute = "dashboard";
let lastProductsHash = null;

/* --------------------------------------------------------------- Routing */

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, query] = raw.split("?");
  const isAuthRoute = path === "login";
  const route =
    isAuthRoute || Object.prototype.hasOwnProperty.call(ROUTES, path) ? path : "dashboard";
  return { route, params: new URLSearchParams(query || "") };
}

function applyRoute() {
  const { route, params } = parseHash();

  if (route === "login") {
    // Someone already signed in shouldn't land back on the sign-in screen.
    if (currentUser()) {
      location.replace("#/dashboard");
      return;
    }
    renderAuthPage("login");
    closeNav();
    return;
  }

  if (!currentUser()) {
    if (location.hash !== "#/login") location.replace("#/login");
    renderAuthPage("login");
    return;
  }

  if (route === "products" && (params.has("q") || params.has("category"))) {
    // A link into the menu starts from a clean filter set, so an old search
    // term can't hide the category the user just asked for.
    const navigated = location.hash !== lastProductsHash;
    lastProductsHash = location.hash;

    if (params.has("q")) {
      filters.q = params.get("q") || "";
      if (globalSearchInput) globalSearchInput.value = filters.q;
      if (navigated) {
        filters.category = "all";
        filters.availability = "all";
      }
    } else if (params.has("category")) {
      filters = { ...defaultFilters(), category: params.get("category") || "all" };
      if (globalSearchInput) globalSearchInput.value = "";
    }
  }

  activeRoute = route;
  render();
  closeNav();
}

function goTo(hash) {
  if (location.hash === hash) {
    applyRoute();
    return;
  }
  location.hash = hash;
}

/* ----------------------------------------------------------- Shell render */

function syncSidebar() {
  const stats = store.stats();
  const settings = store.getSettings();

  const count = document.getElementById("navProductCount");
  if (count) count.textContent = String(stats.total);

  const health = document.getElementById("menuHealthValue");
  if (health) health.textContent = `${stats.availablePct}%`;

  const bar = document.getElementById("menuHealthBar");
  if (bar) bar.style.width = `${stats.availablePct}%`;

  const name = settings.adminName || "Admin";
  const short = initials(name);
  ["sidebarAdminName", "topbarAdminName"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = name;
  });
  const avatar = currentUser()?.avatar || "";
  ["sidebarAvatar", "topbarAvatar"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (avatar) {
      el.textContent = "";
      el.classList.add("avatar--photo");
      el.style.backgroundImage = `url("${avatar}")`;
      el.setAttribute("aria-label", `${name}'s profile photo`);
    } else {
      el.textContent = short;
      el.classList.remove("avatar--photo");
      el.style.backgroundImage = "";
      el.removeAttribute("aria-label");
    }
  });
}

/** Square-crop and shrink any photo the admin picks before storing it. */
function readAvatarFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("That image could not be read."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a photo we can read."));
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        ctx.drawImage(
          img,
          (img.naturalWidth - side) / 2,
          (img.naturalHeight - side) / 2,
          side,
          side,
          0,
          0,
          size,
          size
        );
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function pageMarkup(route) {
  switch (route) {
    case "products":
      return productsPage(filters);
    case "categories":
      return categoriesPage();
    case "settings":
      return settingsPage();
    default:
      return dashboardPage();
  }
}

function render() {
  const meta = ROUTES[activeRoute] || ROUTES.dashboard;

  if (authRoot) {
    authRoot.hidden = true;
    authRoot.innerHTML = "";
  }
  app.hidden = false;

  document.getElementById("pageTitle").textContent = meta.title;
  document.getElementById("pageEyebrow").textContent = meta.eyebrow;
  document.title = `${meta.title} · Spice Route Admin`;

  document.querySelectorAll("[data-nav]").forEach((link) => {
    const isActive = link.getAttribute("data-nav") === activeRoute;
    link.classList.toggle("is-active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  syncSidebar();
  view.innerHTML = pageMarkup(activeRoute);
  hydrateIcons(view);
  bindPage();
}

function bindPage() {
  if (activeRoute === "products") {
    const search = document.getElementById("productSearch");
    search?.addEventListener("input", () => {
      filters.q = search.value;
      refreshResults();
    });

    document.getElementById("categoryFilter")?.addEventListener("change", (event) => {
      filters.category = event.target.value;
      refreshResults();
    });

    document.getElementById("sortFilter")?.addEventListener("change", (event) => {
      filters.sort = event.target.value;
      refreshResults();
    });

    view.querySelectorAll("[data-availability]").forEach((button) => {
      button.addEventListener("click", () => {
        filters.availability = button.getAttribute("data-availability");
        view
          .querySelectorAll("[data-availability]")
          .forEach((item) => item.classList.toggle("is-on", item === button));
        refreshResults();
      });
    });
  }

  if (activeRoute === "settings") bindSettings();
}

function refreshResults() {
  const box = document.getElementById("productResults");
  if (!box) return;
  box.innerHTML = productsResults(filters);
  hydrateIcons(box);
}

function bindSettings() {
  const form = document.getElementById("settingsForm");
  if (!form) return;

  const avatarInput = document.getElementById("adminAvatarInput");
  document.getElementById("pickAvatar")?.addEventListener("click", () => avatarInput?.click());

  avatarInput?.addEventListener("change", async () => {
    const file = avatarInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Choose a JPG, PNG or WebP image.", "error");
      avatarInput.value = "";
      return;
    }

    const me = currentUser();
    if (!me) {
      toast("Sign in again to change your photo.", "error");
      return;
    }

    try {
      const result = setAvatar(me.id, await readAvatarFile(file));
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      render();
      toast("Profile photo updated.", "success");
    } catch (error) {
      toast(error?.message || "That image could not be read.", "error");
    } finally {
      avatarInput.value = "";
    }
  });

  document.getElementById("removeAvatar")?.addEventListener("click", () => {
    const me = currentUser();
    if (!me) return;
    const result = setAvatar(me.id, "");
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    render();
    toast("Profile photo removed.", "info");
  });

  form.querySelectorAll("[data-pref]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-pref");
      const next = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(next));
      store.saveSettings({ [key]: next });
      toast(next ? "Notifications enabled." : "Notifications muted.", "info");
    });
  });

  const addAdmin = document.getElementById("addAdminForm");
  if (addAdmin) {
    addAdmin.addEventListener("submit", async (event) => {
      event.preventDefault();

      const name = addAdmin.querySelector("#new-admin-name").value.trim();
      const email = addAdmin.querySelector("#new-admin-email").value.trim();
      const password = addAdmin.querySelector("#new-admin-password").value;

      if (name.length < 2) {
        toast("Enter the new admin's full name.", "error");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast("Enter a valid email address.", "error");
        return;
      }
      if (password.length < 8) {
        toast("Use at least 8 characters for the password.", "error");
        return;
      }

      const submit = addAdmin.querySelector('button[type="submit"]');
      setBusy(submit, true, "Adding…");
      const result = await register({ name, email, password });
      setBusy(submit, false);

      if (!result.ok) {
        toast(result.error, "error");
        return;
      }

      toast(`${result.user.name} can now sign in to the console.`, "success");
      render();
    });
  }

  view.querySelectorAll("[data-remove-admin]").forEach((button) => {
    button.addEventListener("click", () => {
      const me = currentUser();
      if (me && me.id === button.getAttribute("data-remove-admin")) {
        toast("You can't remove the account you're signed in with.", "error");
        return;
      }
      const result = removeAdmin(button.getAttribute("data-remove-admin"));
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      toast("Admin account removed.", "info");
      render();
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const restaurantName = form.querySelector("#set-restaurant").value.trim();
    const adminName = form.querySelector("#set-admin").value.trim();
    const adminEmail = form.querySelector("#set-email").value.trim();
    const currency = form.querySelector("#set-currency").value;
    const contactAddress = form
      .querySelector("#set-address")
      .value.split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
    const contactPhone = form.querySelector("#set-phone").value.trim();
    const contactHours = form.querySelector("#set-hours").value.trim();
    const contactEmail = form.querySelector("#set-contact-email").value.trim();

    if (!restaurantName) {
      toast("Restaurant name cannot be empty.", "error");
      form.querySelector("#set-restaurant").focus();
      return;
    }
    if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      toast("That email address looks incomplete.", "error");
      form.querySelector("#set-email").focus();
      return;
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      toast("Check the storefront email address.", "error");
      form.querySelector("#set-contact-email").focus();
      return;
    }
    if (!contactAddress || !contactPhone) {
      toast("Add an address and a phone number for the storefront.", "error");
      form.querySelector(!contactAddress ? "#set-address" : "#set-phone").focus();
      return;
    }

    store.saveSettings({
      restaurantName,
      adminName: adminName || "Admin",
      adminEmail,
      currency,
      contactAddress,
      contactPhone,
      contactHours,
      contactEmail,
    });

    syncSidebar();
    view.innerHTML = settingsPage();
    hydrateIcons(view);
    bindSettings();
    view.querySelector("#savedNote")?.classList.add("is-on");
    toast("Settings saved.");
  });
}

/* ------------------------------------------------------------- View events */

view.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || !view.contains(button)) return;

  const action = button.getAttribute("data-action");
  const id = button.getAttribute("data-id");

  switch (action) {
    case "add-product":
      openProductForm(null, render);
      break;

    case "edit-product": {
      const product = store.getProduct(id);
      if (product) openProductForm(product.id, render);
      break;
    }

    case "delete-product": {
      const product = store.getProduct(id);
      if (product) confirmDeleteProduct(product, render);
      break;
    }

    case "toggle-product": {
      const product = store.toggleProduct(id);
      if (product) {
        toast(`"${product.name}" marked ${product.available ? "available" : "unavailable"}.`, "info");
        render();
      }
      break;
    }

    case "add-category":
      openCategoryForm(null, render);
      break;

    case "rename-category": {
      const category = store.categoryById(id);
      if (category) openCategoryForm(category, render);
      break;
    }

    case "delete-category": {
      const category = store.categoryById(id);
      if (!category) break;
      const count = store.getProducts().filter((product) => product.categoryId === category.id).length;
      confirmDeleteCategory(category, count, render);
      break;
    }

    case "clear-filters":
      filters = defaultFilters();
      render();
      break;

    case "reset-data":
      confirmDialog({
        title: "Reset demo data?",
        message:
          "Every product, category and activity entry will be replaced with the original sample restaurant. This cannot be undone.",
        confirmLabel: "Reset everything",
        onConfirm() {
          store.reset();
          filters = defaultFilters();
          render();
          toast("Demo data restored.");
        },
      });
      break;

    default:
      break;
  }
});

/* -------------------------------------------------------- Sidebar + topbar */

const COLLAPSE_KEY = "spiceroute.sidebar";

function setCollapsed(collapsed) {
  app.setAttribute("data-collapsed", String(collapsed));
  localStorage.setItem(COLLAPSE_KEY, collapsed ? "collapsed" : "expanded");
  const btn = document.getElementById("collapseBtn");
  if (btn) btn.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
}

document.getElementById("collapseBtn")?.addEventListener("click", () => {
  setCollapsed(app.getAttribute("data-collapsed") !== "true");
});

function openNav() {
  app.classList.add("nav-open");
  if (scrim) scrim.hidden = false;
}

function closeNav() {
  app.classList.remove("nav-open");
  if (scrim) scrim.hidden = true;
}

document.getElementById("menuBtn")?.addEventListener("click", openNav);
document.getElementById("closeNavBtn")?.addEventListener("click", closeNav);
scrim?.addEventListener("click", closeNav);

document.querySelectorAll(".sidebar a[href^='#/']").forEach((link) => {
  link.addEventListener("click", closeNav);
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (app.classList.contains("nav-open")) closeNav();
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 1024) closeNav();
});

/* --------------------------------------------------------------- Topbar UI */

globalSearch?.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = (globalSearchInput?.value || "").trim();
  filters = { ...defaultFilters(), q: query };
  goTo(`#/products${query ? `?q=${encodeURIComponent(query)}` : ""}`);
});

function goSettings() {
  goTo("#/settings");
}

document.getElementById("adminChip")?.addEventListener("click", goSettings);
document.getElementById("sidebarAdmin")?.addEventListener("click", goSettings);

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  confirmDialog({
    title: "Log out of Spice Route?",
    message: "Your menu edits stay saved in this browser. Sign back in any time to keep managing the storefront.",
    confirmLabel: "Log out",
    tone: "primary",
    iconName: "log-out",
    onConfirm() {
      logout();
      toast("You have been signed out.", "info");
      location.hash = "#/login";
    },
  });
});

/* -------------------------------------------------------------- Auth pages */

function authAlert(message) {
  const box = authRoot?.querySelector("#authAlert");
  const text = authRoot?.querySelector("#authAlertText");
  if (!box || !text) return;
  text.textContent = message || "";
  box.hidden = !message;
}

function authFieldError(id, message) {
  const input = authRoot?.querySelector(`#${id}`);
  const field = input?.closest(".field");
  if (!field) return;
  field.classList.toggle("has-error", Boolean(message));
  const error = field.querySelector("[data-error]");
  if (error && message) error.textContent = message;
}

function setBusy(button, isBusy, label) {
  if (!button) return;
  if (isBusy) {
    button.dataset.original = button.innerHTML;
    button.disabled = true;
    button.textContent = label;
  } else {
    button.disabled = false;
    if (button.dataset.original) {
      button.innerHTML = button.dataset.original;
      delete button.dataset.original;
    }
  }
}

function firstWord(name) {
  return String(name || "Chef").trim().split(/\s+/)[0];
}

function renderAuthPage(route) {
  if (!authRoot) return;
  app.hidden = true;
  authRoot.hidden = false;
  authRoot.innerHTML = loginPage();
  hydrateIcons(authRoot);
  bindAuthUI(authRoot);
  document.title = "Sign in · Spice Route Admin";
  window.scrollTo({ top: 0 });
  bindLoginForm();
}

function resetAuthErrors(form) {
  authAlert("");
  form.querySelectorAll(".field.has-error").forEach((field) => field.classList.remove("has-error"));
}

function bindLoginForm() {
  const form = authRoot.querySelector("#loginForm");
  if (!form) return;

  const submit = form.querySelector('button[type="submit"]');
  const emailInput = form.querySelector("#login-email");
  const passwordInput = form.querySelector("#login-password");

  form.addEventListener("input", () => resetAuthErrors(form));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    resetAuthErrors(form);

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let firstInvalid = null;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      authFieldError("login-email", "Enter a valid email address.");
      firstInvalid = firstInvalid || emailInput;
    }
    if (!password) {
      authFieldError("login-password", "Enter your password.");
      firstInvalid = firstInvalid || passwordInput;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    setBusy(submit, true, "Signing in…");
    const result = await login({ email, password });
    setBusy(submit, false);

    if (!result.ok) {
      authAlert(result.error);
      passwordInput.focus();
      passwordInput.select();
      return;
    }

    store.adoptAccount({ name: result.user.name, email: result.user.email });
    toast(`Welcome back, ${firstWord(result.user.name)}.`);
    location.hash = "#/dashboard";
  });
}

/* -------------------------------------------------------- Broken food photos */

document.addEventListener(
  "error",
  (event) => {
    const img = event.target;
    if (img instanceof HTMLImageElement && img.closest(".product-media, .thumb, .recent-row, .image-preview")) {
      img.remove();
    }
  },
  true
);

/* ------------------------------------------ Storefront ↔ console sync */

function applyRemoteState() {
  if (!currentUser()) return;
  store.reload();
  if (authRoot && !authRoot.hidden) return;
  render();
}

window.addEventListener("storage", (event) => {
  if (event.key !== "spiceroute.admin.v1" || !event.newValue) return;
  window.clearTimeout(window.__adminSync);
  window.__adminSync = window.setTimeout(applyRemoteState, 160);
});

// The storefront may live in a different browser: the sync server carries its changes here.
onSync(applyRemoteState);

/* ------------------------------------------------------------------- Start */

async function start() {
  const savedLayout = localStorage.getItem(COLLAPSE_KEY);
  setCollapsed(savedLayout === "collapsed");

  await ensureDemoAccount().catch(() => {});
  startSync();

  window.addEventListener("hashchange", applyRoute);

  if (!location.hash) history.replaceState(null, "", "#/dashboard");
  applyRoute();
  hydrateIcons(document);
}

start();
