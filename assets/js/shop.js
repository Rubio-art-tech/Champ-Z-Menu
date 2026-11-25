/* Customer storefront: routing, chrome and the online menu. */

import { esc, money } from "./format.js";
import { hydrateIcons } from "./icons.js";
import { onSync, startSync } from "./live-sync.js";
import { aboutPage, contactPage, homePage, menuPage, menuResults } from "./shop-pages.js";
import { store } from "./store.js";
import { openModal, toast } from "./ui.js";

const ROUTES = {
  "": "home",
  home: "home",
  menu: "menu",
  about: "about",
  contact: "contact",
};

const TITLES = {
  home: "Champ'Z Foodie — Food delivered to your door",
  menu: "Menu · Champ'Z Foodie",
  about: "About us · Champ'Z Foodie",
  contact: "Contact · Champ'Z Foodie",
};

const view = document.getElementById("shopView");
const drawer = document.getElementById("shopDrawer");
const header = document.querySelector(".shop-header");

let menuFilters = { q: "", category: "all", sort: "newest" };
let activeRoute = "home";
let lastRenderedHash = null;

/* --------------------------------------------------------------- Utilities */

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, query] = raw.split("?");
  const key = Object.prototype.hasOwnProperty.call(ROUTES, path) ? path : "home";
  return { route: ROUTES[key], params: new URLSearchParams(query || "") };
}

function go(hash) {
  if (location.hash === hash) {
    render();
    return;
  }
  location.hash = hash;
}

function setFieldError(root, fieldName, message) {
  const field = root.querySelector(`[data-field="${fieldName}"]`);
  if (!field) return;
  field.classList.toggle("has-error", Boolean(message));
  const error = field.querySelector("[data-error]");
  if (error && message) error.textContent = message;
}

function clearErrors(root) {
  root.querySelectorAll(".field.has-error").forEach((field) => field.classList.remove("has-error"));
}

/* ----------------------------------------------------------------- Chrome */

function setActiveNav(route) {
  document.querySelectorAll("[data-shop-nav]").forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("data-shop-nav") === route);
  });
}

function openDrawer() {
  drawer.hidden = false;
  document.body.style.overflow = "hidden";
  document.getElementById("shopMenuBtn")?.setAttribute("aria-expanded", "true");
}

function closeDrawer() {
  drawer.hidden = true;
  document.body.style.overflow = "";
  document.getElementById("shopMenuBtn")?.setAttribute("aria-expanded", "false");
}

/* ------------------------------------------------------------- Render core */

function currentPage() {
  switch (activeRoute) {
    case "menu":
      return menuPage(menuFilters);
    case "about":
      return aboutPage();
    case "contact":
      return contactPage();
    default:
      return homePage();
  }
}

function render() {
  const { route, params } = parseHash();
  const navigated = location.hash !== lastRenderedHash;
  lastRenderedHash = location.hash;

  if (route === "menu" && navigated && (params.has("category") || params.has("q") || params.has("sort"))) {
    // Following a category or search link starts fresh, so a leftover search
    // term can't produce an empty menu.
    menuFilters = {
      q: params.get("q") || "",
      category: params.get("category") || "all",
      sort: params.get("sort") || "newest",
    };
  }

  activeRoute = route;

  view.innerHTML = currentPage();
  hydrateIcons(view);
  updateChrome();
  bindPage();

  document.title = TITLES[route] || TITLES.home;
  window.scrollTo({ top: 0 });
}

function updateChrome() {
  setActiveNav(activeRoute);
  updateContactDetails();
}

/* Footer and drawer contact details come from the admin settings. */
function updateContactDetails() {
  const settings = store.getSettings();
  const multiline = (text) => esc(text || "").replace(/\n/g, "<br />");

  const address = document.getElementById("footerAddress");
  if (address) address.innerHTML = multiline(settings.contactAddress);

  const phone = document.getElementById("footerPhone");
  if (phone) {
    phone.textContent = settings.contactPhone || "";
    phone.href = `tel:${(settings.contactPhone || "").replace(/[^\d+]/g, "")}`;
  }

  const email = document.getElementById("footerEmail");
  if (email) {
    email.textContent = settings.contactEmail || "";
    email.href = `mailto:${settings.contactEmail || ""}`;
  }

  const socialEmail = document.getElementById("footerSocialEmail");
  if (socialEmail) socialEmail.href = `mailto:${settings.contactEmail || ""}`;

  const hours = document.getElementById("footerHours");
  if (hours) hours.innerHTML = multiline(settings.contactHours);

  const drawerHours = document.getElementById("drawerHours");
  if (drawerHours) drawerHours.textContent = settings.contactHours || "";
}

function bindPage() {
  if (activeRoute === "menu") bindMenu();
  if (activeRoute === "contact") bindContact();
}

/* ------------------------------------------------------------------- Menu */

function refreshMenu() {
  const box = document.getElementById("menuResults");
  if (!box) return;
  box.innerHTML = menuResults(menuFilters);
  hydrateIcons(box);
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.classList.toggle("is-on", button.getAttribute("data-category") === menuFilters.category);
  });
}

function bindMenu() {
  const search = document.getElementById("menuSearch");
  search?.addEventListener("input", () => {
    menuFilters.q = search.value;
    refreshMenu();
  });

  document.getElementById("menuSort")?.addEventListener("change", (event) => {
    menuFilters.sort = event.target.value;
    refreshMenu();
  });

  document.querySelectorAll(".menu-pills [data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      menuFilters.category = button.getAttribute("data-category") || "all";
      refreshMenu();
    });
  });
}

/* ---------------------------------------------------------------- Contact */

function bindContact() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("input", () => clearErrors(form));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearErrors(form);

    const name = form.querySelector("#contact-name");
    const email = form.querySelector("#contact-email");
    const message = form.querySelector("#contact-message");
    let firstInvalid = null;

    if (name.value.trim().length < 2) {
      setFieldError(form, "contact-name", "Please enter your name.");
      firstInvalid = firstInvalid || name;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      setFieldError(form, "contact-email", "Enter a valid email address.");
      firstInvalid = firstInvalid || email;
    }
    if (message.value.trim().length < 5) {
      setFieldError(form, "contact-message", "Write a short message.");
      firstInvalid = firstInvalid || message;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    form.reset();
    toast("Message sent — the kitchen will get back to you.");
  });
}

/* --------------------------------------------------------- Product details */

function openProductModal(productId) {
  const product = store.getProduct(productId);
  if (!product || !product.available) {
    toast("That dish is not available right now.", "error");
    return;
  }

  openModal({
    title: product.name,
    subtitle: `${store.categoryName(product.categoryId)} · available to pre-order`,
    iconName: "utensils",
    size: "modal--wide",
    body: `
      <div class="product-sheet">
        <div class="product-sheet-media">
          ${product.image ? `<img src="${esc(product.image)}" alt="${esc(product.name)}" />` : ""}
        </div>
        <div class="product-sheet-info">
          <p class="sheet-cat">${esc(store.categoryName(product.categoryId))}</p>
          <p class="sheet-desc">${esc(product.description || "Freshly prepared by our kitchen.")}</p>
          <div class="sheet-price">${money(product.price, "PHP")}<span>PHP</span></div>
          <p class="sheet-note"><span data-icon="clock"></span>Prepared to order · served 2–3 days after ordering</p>
        </div>
      </div>
    `,
  });
}

/* ---------------------------------------------------------------- Events */

// Bound on the document so header and drawer actions work too.
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.getAttribute("data-action");
  const id = button.getAttribute("data-id");

  switch (action) {
    case "open-product":
      openProductModal(id);
      break;

    case "clear-menu-filters":
      menuFilters = { q: "", category: "all", sort: menuFilters.sort };
      go("#/menu");
      break;

    default:
      break;
  }
});

/* --------------------------------------------------------------- Header UI */

document.getElementById("shopMenuBtn")?.addEventListener("click", openDrawer);
document.getElementById("shopDrawerClose")?.addEventListener("click", closeDrawer);
document.getElementById("shopDrawer")?.addEventListener("mousedown", (event) => {
  if (event.target === event.currentTarget) closeDrawer();
});

document.querySelectorAll(".shop-drawer a[href^='#/']").forEach((link) => {
  link.addEventListener("click", closeDrawer);
});

// Drawer links are re-rendered, so close the drawer from the panel.
document.getElementById("shopDrawer")?.addEventListener("click", (event) => {
  if (event.target.closest('a[href^="#/"]')) closeDrawer();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDrawer();
});

window.addEventListener("scroll", () => {
  header?.classList.toggle("is-stuck", window.scrollY > 8);
});

window.addEventListener("hashchange", render);

function applyRemoteState() {
  store.reload();
  render();
}

window.addEventListener("storage", (event) => {
  if (!event.key || !event.key.startsWith("spiceroute.")) return;
  // Menu or availability changes made in the admin tab.
  if (event.key === "spiceroute.admin.v1") {
    window.clearTimeout(window.__shopSync);
    window.__shopSync = window.setTimeout(applyRemoteState, 180);
  }
});

// The admin console may run in another browser: the sync server carries its changes here.
onSync(applyRemoteState);

/* ------------------------------------------------------------------- Start */

const year = document.getElementById("shopYear");
if (year) year.textContent = String(new Date().getFullYear());

if (!location.hash) history.replaceState(null, "", "#/");
render();
hydrateIcons(document);
startSync();
