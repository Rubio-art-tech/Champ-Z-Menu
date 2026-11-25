/* Page templates. Each function returns an HTML string for the view container. */

import { currentUser, listAdmins } from "./auth.js";
import { esc, money, formatDate, timeAgo } from "./format.js";
import { icon } from "./icons.js";
import { store } from "./store.js";

const HERO_PHOTO =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1100&q=80";

const SORTS = {
  newest: "Newest first",
  oldest: "Oldest first",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "name-asc": "Name: A to Z",
};

function firstName(name) {
  return String(name || "Chef").trim().split(/\s+/)[0];
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function initialsOf(name) {
  return String(name || "Dish")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/* ------------------------------------------------------------------ Stats */

function statCard({ label, value, iconName, tint, tone, foot }) {
  return `
    <article class="stat-card" style="--tint:${tint};--tone:${tone}">
      <div class="stat-top">
        <span class="stat-label">${esc(label)}</span>
        <span class="stat-icon">${icon(iconName)}</span>
      </div>
      <div class="stat-value">${value}</div>
      <div class="stat-foot">${foot}</div>
    </article>
  `;
}

/* -------------------------------------------------------------- Dashboard */

export function dashboardPage() {
  const products = store.getProducts();
  const categories = store.getCategories();
  const settings = store.getSettings();
  const stats = store.stats();
  const currency = settings.currency;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = products.filter((product) => new Date(product.createdAt).getTime() >= weekAgo).length;

  const recent = [...products]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  const activity = store.getActivity(5);

  const mix = categories
    .map((category) => {
      const items = products.filter((product) => product.categoryId === category.id);
      return { ...category, count: items.length };
    })
    .sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...mix.map((category) => category.count));

  const summary =
    stats.total === 0
      ? "Your menu is empty. Add your first dish to open the storefront."
      : `${newThisWeek} dish${newThisWeek === 1 ? "" : "es"} added in the last 7 days · ${
          stats.unavailable === 0
            ? "every dish is orderable"
            : `${stats.unavailable} paused for review`
        }.`;

  const statsMarkup = [
    statCard({
      label: "Total products",
      value: stats.total,
      iconName: "package",
      tint: "var(--brand-soft)",
      tone: "var(--brand-deep)",
      foot: `<span class="up">${icon("trending-up")}${newThisWeek}</span> added this week`,
    }),
    statCard({
      label: "Available products",
      value: stats.available,
      iconName: "check-circle",
      tint: "var(--green-soft)",
      tone: "var(--green)",
      foot: `${stats.availablePct}% of the menu is orderable`,
    }),
    statCard({
      label: "Unavailable products",
      value: stats.unavailable,
      iconName: "circle-slash",
      tint: "var(--red-soft)",
      tone: "var(--red)",
      foot: stats.unavailable ? `<span class="warn">Needs a quick review</span>` : `Nothing paused right now`,
    }),
    statCard({
      label: "Food categories",
      value: stats.categories,
      iconName: "tags",
      tint: "#efe9ff",
      tone: "#6d4bb8",
      foot: `Across ${stats.total} dish${stats.total === 1 ? "" : "es"}`,
    }),
  ].join("");

  const recentMarkup = recent.length
    ? recent
        .map(
          (product) => `
          <div class="recent-row">
            <div class="thumb">
              <span>${esc(initialsOf(product.name))}</span>
              ${product.image ? `<img src="${esc(product.image)}" alt="" loading="lazy" />` : ""}
            </div>
            <div class="recent-body">
              <strong>${esc(product.name)}</strong>
              <small>${esc(store.categoryName(product.categoryId))} · added ${timeAgo(product.createdAt)}</small>
            </div>
            <span class="recent-price">${money(product.price, currency)}</span>
            <button class="recent-edit" type="button" data-action="edit-product" data-id="${product.id}"
              aria-label="Edit ${esc(product.name)}" title="Edit dish">${icon("pencil")}</button>
          </div>`
        )
        .join("")
    : `<p class="empty-note">No dishes yet — your newest additions will show up here.</p>`;

  const activityMarkup = activity.length
    ? activity
        .map(
          (entry) => `
          <li class="activity-item">
            <span class="activity-icon" style="--tone:${entry.meta.tone}" data-icon="${entry.meta.icon}"></span>
            <div class="activity-body">
              <p>${entry.text}</p>
              <time datetime="${esc(entry.at)}">${timeAgo(entry.at)}</time>
            </div>
          </li>`
        )
        .join("")
    : `<p class="empty-note">Your latest menu actions will appear here.</p>`;

  const mixMarkup = mix.length
    ? mix
        .map(
          (category) => `
          <div class="mix-row" style="--dot:${category.tone}">
            <span class="mix-dot"></span>
            <div class="mix-main">
              <div class="mix-label">
                <span>${esc(category.name)}</span>
              </div>
              <div class="mix-bar"><span style="width:${Math.round((category.count / maxCount) * 100)}%"></span></div>
            </div>
            <span class="mix-count">${category.count}</span>
          </div>`
        )
        .join("")
    : `<p class="empty-note">Add categories to see how your menu is balanced.</p>`;

  return `
    <section class="hero">
      <div class="hero-copy">
        <span class="hero-tag"><span class="pulse"></span>Storefront synced</span>
        <h2>${greeting()}, ${esc(firstName(settings.adminName))}.<br />Your menu is <em>${stats.availablePct}% orderable</em>.</h2>
        <p>${esc(summary)}</p>
        <div class="hero-actions">
          <button class="btn btn--primary" type="button" data-action="add-product">
            <span data-icon="plus"></span>Add new dish
          </button>
          <a class="btn btn--quiet" href="#/products">
            <span data-icon="utensils"></span>Manage menu
          </a>
        </div>
      </div>
      <div class="hero-visual">
        <img src="${HERO_PHOTO}" alt="A table spread of freshly prepared dishes" />
        <div class="hero-float">
          <span class="hero-float-icon" data-icon="flame"></span>
          <span class="hero-float-text">
            <strong>${esc(settings.restaurantName)}</strong>
            <small>${stats.total} dishes · ${stats.categories} categories</small>
          </span>
          <span class="hero-float-badge">Live</span>
        </div>
      </div>
    </section>

    <section class="stats" aria-label="Menu statistics">${statsMarkup}</section>

    <div class="dash-grid">
      <section class="panel" aria-labelledby="recentTitle">
        <div class="panel-head">
          <div>
            <h3 id="recentTitle">Recently added</h3>
            <p>The newest dishes on your menu</p>
          </div>
          <a class="link-btn" href="#/products">View all <span data-icon="arrow-right"></span></a>
        </div>
        <div class="recent-list">${recentMarkup}</div>
      </section>

      <section class="panel" aria-labelledby="activityTitle">
        <div class="panel-head">
          <div>
            <h3 id="activityTitle">Recent activity</h3>
            <p>Your latest menu actions</p>
          </div>
          <span class="chip"><span class="dot-mini"></span>Live log</span>
        </div>
        <ul class="activity-list">${activityMarkup}</ul>
      </section>
    </div>

    <section class="panel" aria-labelledby="mixTitle">
      <div class="panel-head">
        <div>
          <h3 id="mixTitle">Menu mix</h3>
          <p>Dishes per category</p>
        </div>
        <a class="link-btn" href="#/categories">Manage categories <span data-icon="arrow-right"></span></a>
      </div>
      <div class="mix-card">${mixMarkup}</div>
    </section>
  `;
}

/* --------------------------------------------------------------- Products */

export function defaultFilters() {
  return { q: "", category: "all", availability: "all", sort: "newest" };
}

export function filterProducts(filters, list = store.getProducts()) {
  const query = filters.q.trim().toLowerCase();
  let result = list.filter((product) => {
    if (filters.category !== "all" && product.categoryId !== filters.category) return false;
    if (filters.availability === "available" && !product.available) return false;
    if (filters.availability === "unavailable" && product.available) return false;
    if (!query) return true;
    const haystack = [
      product.name,
      product.description,
      store.categoryName(product.categoryId),
      String(product.price),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  const byName = (a, b) => a.name.localeCompare(b.name);
  switch (filters.sort) {
    case "oldest":
      result = [...result].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case "price-asc":
      result = [...result].sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      result = [...result].sort((a, b) => b.price - a.price);
      break;
    case "name-asc":
      result = [...result].sort(byName);
      break;
    default:
      result = [...result].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return result;
}

function productCard(product, currency) {
  const category = store.categoryById(product.categoryId);
  return `
    <article class="product-card" data-product="${product.id}">
      <div class="product-media">
        <span class="thumb-initials">${esc(initialsOf(product.name))}</span>
        ${product.image ? `<img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy" />` : ""}
        <span class="product-flag ${product.available ? "" : "is-off"}">
          <span class="dot-mini"></span>${product.available ? "Available" : "Unavailable"}
        </span>
        <div class="product-quick">
          <button class="quick-btn" type="button" data-action="edit-product" data-id="${product.id}"
            aria-label="Edit ${esc(product.name)}" title="Edit dish">${icon("pencil")}</button>
          <button class="quick-btn is-danger" type="button" data-action="delete-product" data-id="${product.id}"
            aria-label="Delete ${esc(product.name)}" title="Delete dish">${icon("trash")}</button>
        </div>
      </div>
      <div class="product-body">
        <div class="product-meta">
          <span class="product-cat">${esc(category?.name || "Uncategorized")}</span>
          <button class="switch" type="button" data-action="toggle-product" data-id="${product.id}"
            aria-pressed="${product.available}"
            aria-label="${product.available ? "Mark as unavailable" : "Mark as available"}"
            title="${product.available ? "Mark as unavailable" : "Mark as available"}">
            <span class="switch-track"></span>
          </button>
        </div>
        <h3>${esc(product.name)}</h3>
        <p class="product-desc">${esc(product.description || "No description yet.")}</p>
        <div class="product-foot">
          <span class="product-price">${money(product.price, currency)}<small>${esc(currency)}</small></span>
          <div class="product-actions">
            <button class="icon-action" type="button" data-action="edit-product" data-id="${product.id}"
              aria-label="Edit ${esc(product.name)}" title="Edit dish">${icon("pencil")}</button>
            <button class="icon-action is-danger" type="button" data-action="delete-product" data-id="${product.id}"
              aria-label="Delete ${esc(product.name)}" title="Delete dish">${icon("trash")}</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

export function productsResults(filters) {
  const all = store.getProducts();
  const results = filterProducts(filters, all);
  const currency = store.getSettings().currency;
  const hasFilters =
    filters.q.trim() !== "" || filters.category !== "all" || filters.availability !== "all";

  const meta = `
    <div class="list-meta">
      <span>Showing <strong>${results.length}</strong> of ${all.length} dish${all.length === 1 ? "" : "es"}</span>
      ${hasFilters ? `<button class="link-btn" type="button" data-action="clear-filters">Clear filters ${icon("x")}</button>` : ""}
    </div>
  `;

  if (!all.length) {
    return `${meta}
      <div class="empty-state">
        <span class="empty-icon" data-icon="chef-hat"></span>
        <h3>Your menu is waiting</h3>
        <p>Add your first dish with a photo, price and description. It will appear on the storefront right away.</p>
        <button class="btn btn--primary" type="button" data-action="add-product">
          <span data-icon="plus"></span>Add your first dish
        </button>
      </div>`;
  }

  if (!results.length) {
    return `${meta}
      <div class="empty-state">
        <span class="empty-icon" data-icon="search"></span>
        <h3>No dishes match</h3>
        <p>Try a different search term, category or availability filter.</p>
        <button class="btn btn--ghost" type="button" data-action="clear-filters">Clear filters</button>
      </div>`;
  }

  return `${meta}<div class="product-grid">${results.map((product) => productCard(product, currency)).join("")}</div>`;
}

export function productsPage(filters) {
  const categories = store.getCategories();
  const stats = store.stats();

  const categoryOptions = [
    `<option value="all" ${filters.category === "all" ? "selected" : ""}>All categories</option>`,
    ...categories.map(
      (category) =>
        `<option value="${category.id}" ${filters.category === category.id ? "selected" : ""}>${esc(
          category.name
        )}</option>`
    ),
  ].join("");

  const sortOptions = Object.entries(SORTS)
    .map(
      ([value, label]) =>
        `<option value="${value}" ${filters.sort === value ? "selected" : ""}>${esc(label)}</option>`
    )
    .join("");

  const availabilityButton = (value, label) => `
    <button type="button" data-availability="${value}"
      class="${filters.availability === value ? "is-on" : ""}">${label}</button>
  `;

  return `
    <section class="page-intro">
      <div>
        <h2>Your menu, beautifully organised.</h2>
        <p><strong>${stats.available}</strong> of ${stats.total} dishes are live · ${stats.categories} categories</p>
      </div>
      <button class="btn btn--primary" type="button" data-action="add-product">
        <span data-icon="plus"></span>Add product
      </button>
    </section>

    <div class="toolbar">
      <label class="search-field">
        <span data-icon="search"></span>
        <input type="search" id="productSearch" placeholder="Search dishes, categories…"
          aria-label="Search dishes" value="${esc(filters.q)}" autocomplete="off" />
      </label>
      <div class="select-wrap">
        <select id="categoryFilter" aria-label="Filter by category">${categoryOptions}</select>
        <span data-icon="chevron-down"></span>
      </div>
      <div class="segmented" role="group" aria-label="Filter by availability">
        ${availabilityButton("all", "All")}
        ${availabilityButton("available", "Available")}
        ${availabilityButton("unavailable", "Unavailable")}
      </div>
      <div class="select-wrap">
        <select id="sortFilter" aria-label="Sort dishes">${sortOptions}</select>
        <span data-icon="chevron-down"></span>
      </div>
    </div>

    <section id="productResults" aria-live="polite">${productsResults(filters)}</section>
  `;
}

/* ------------------------------------------------------------- Categories */

export function categoriesPage() {
  const categories = store.getCategories();
  const products = store.getProducts();
  const currency = store.getSettings().currency;

  const cards = categories
    .map((category) => {
      const items = products.filter((product) => product.categoryId === category.id);
      const available = items.filter((product) => product.available).length;
      const average = items.length
        ? items.reduce((total, product) => total + product.price, 0) / items.length
        : 0;

      return `
        <article class="category-card" style="--tint:${category.tint};--tone:${category.tone}">
          <div class="category-top">
            <span class="category-icon" data-icon="${category.icon || "tags"}"></span>
            <div>
              <h3 class="category-name">${esc(category.name)}</h3>
              <p class="category-sub">${items.length} dish${items.length === 1 ? "" : "es"} on the menu</p>
            </div>
          </div>

          <div class="category-stats">
            <div class="category-stat">
              <strong>${items.length}</strong>
              <span>Products</span>
            </div>
            <div class="category-stat">
              <strong>${available}</strong>
              <span>Available</span>
            </div>
            <div class="category-stat">
              <strong>${items.length ? money(average, currency) : "—"}</strong>
              <span>Avg. price</span>
            </div>
          </div>

          <div class="category-foot">
            <a class="link-btn" href="#/products?category=${category.id}">
              View dishes <span data-icon="arrow-right"></span>
            </a>
            <div class="category-actions">
              <button class="btn btn--ghost btn--sm" type="button" data-action="rename-category" data-id="${category.id}"
                aria-label="Rename ${esc(category.name)}" title="Rename category">
                <span data-icon="pencil"></span>Rename
              </button>
              <button class="btn btn--danger-soft btn--sm" type="button" data-action="delete-category" data-id="${category.id}"
                aria-label="Delete ${esc(category.name)}" title="Delete category">
                <span data-icon="trash"></span>Delete
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <section class="page-intro">
      <div>
        <h2>Categories shape the menu.</h2>
        <p>Guests browse by category — keep each one focused and easy to scan.</p>
      </div>
      <button class="btn btn--primary" type="button" data-action="add-category">
        <span data-icon="plus"></span>New category
      </button>
    </section>

    ${
      categories.length
        ? `<div class="category-grid">${cards}</div>`
        : `<div class="empty-state">
             <span class="empty-icon" data-icon="tags"></span>
             <h3>No categories yet</h3>
             <p>Categories group your dishes into sections like Mains, Desserts or Drinks.</p>
             <button class="btn btn--primary" type="button" data-action="add-category">
               <span data-icon="plus"></span>Create a category
             </button>
           </div>`
    }
  `;
}

/* --------------------------------------------------------------- Settings */

const CURRENCIES = [
  ["PHP", "Philippine peso (₱)"],
  ["USD", "US dollar ($)"],
  ["EUR", "Euro (€)"],
  ["GBP", "British pound (£)"],
  ["SGD", "Singapore dollar (S$)"],
  ["AED", "UAE dirham (AED)"],
];

function avatarMarkup(avatar, name, extra = "") {
  const cls = `avatar${extra ? ` ${extra}` : ""}${avatar ? " avatar--photo" : ""}`;
  const style = avatar ? ` style="background-image:url(&quot;${avatar}&quot;)"` : "";
  return `<span class="${cls}"${style} aria-hidden="true">${avatar ? "" : esc(initialsOf(name))}</span>`;
}

export function settingsPage() {
  const settings = store.getSettings();
  const me = currentUser();
  const profileName = (me && me.name) || settings.adminName;
  const profileAvatar = (me && me.avatar) || "";
  const admins = listAdmins();
  const adminRows = admins
    .map((admin) => {
      const isMe = Boolean(me && me.id === admin.id);
      return `
        <div class="pref-row">
          <span class="pref-person">
            ${avatarMarkup(admin.avatar, admin.name, "avatar--sm")}
            <span>
              <strong>${esc(admin.name)}</strong>
              <small>${esc(admin.email)}</small>
            </span>
          </span>
          ${
            isMe
              ? `<span class="chip chip--available"><span class="dot-mini"></span>You</span>`
              : `<button class="btn btn--ghost btn--sm" type="button" data-remove-admin="${admin.id}">
                   <span data-icon="trash"></span>Remove
                 </button>`
          }
        </div>`;
    })
    .join("");

  const currencyOptions = CURRENCIES.map(
    ([code, label]) =>
      `<option value="${code}" ${settings.currency === code ? "selected" : ""}>${esc(label)}</option>`
  ).join("");

  return `
    <section class="page-intro">
      <div>
        <h2>Make the console yours.</h2>
        <p>Restaurant details feed the storefront and every receipt.</p>
      </div>
    </section>

    <div class="settings-grid">
      <form class="panel" id="settingsForm" novalidate>
        <div class="form-section">
          <div class="form-section-head">
            <h3>Restaurant profile</h3>
            <p>Shown to guests on the storefront.</p>
          </div>
          <div class="field">
            <label for="set-restaurant">Restaurant name</label>
            <input id="set-restaurant" type="text" maxlength="60" value="${esc(settings.restaurantName)}" />
          </div>
          <div class="form-row">
            <div class="field">
              <label for="set-admin">Administrator name</label>
              <input id="set-admin" type="text" maxlength="60" value="${esc(settings.adminName)}" />
            </div>
            <div class="field">
              <label for="set-email">Contact email</label>
              <input id="set-email" type="email" maxlength="80" value="${esc(settings.adminEmail)}" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label for="set-currency">Menu currency</label>
              <select id="set-currency">${currencyOptions}</select>
              <span class="field-hint">Applies to all prices across the dashboard.</span>
            </div>
            <div class="field">
              <span class="field-label">Storefront status</span>
              <div class="form-switch-row">
                <span>
                  <strong>Menu published</strong>
                  <small>Visible on the storefront</small>
                </span>
                <span class="chip chip--available"><span class="dot-mini"></span>Live</span>
              </div>
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-head">
            <h3>Get in touch</h3>
            <p>Shown in the storefront footer and on the contact page.</p>
          </div>
          <div class="field">
            <label for="set-address">Address</label>
            <textarea id="set-address" rows="2" maxlength="140"
              placeholder="Street, city, province">${esc(settings.contactAddress)}</textarea>
            <span class="field-hint">Press Enter to start a new line in the footer.</span>
          </div>
          <div class="form-row">
            <div class="field">
              <label for="set-phone">Phone or text number</label>
              <input id="set-phone" type="tel" maxlength="32" value="${esc(settings.contactPhone)}"
                placeholder="0917 555 0123" />
            </div>
            <div class="field">
              <label for="set-hours">Opening hours</label>
              <input id="set-hours" type="text" maxlength="60" value="${esc(settings.contactHours)}"
                placeholder="Tue – Sun · 10:00 AM – 10:00 PM" />
            </div>
          </div>
          <div class="field">
            <label for="set-contact-email">Storefront email</label>
            <input id="set-contact-email" type="email" maxlength="80" value="${esc(settings.contactEmail)}"
              placeholder="hello@champzfoodie.ph" />
            <span class="field-hint">Customers use this address to reach the kitchen.</span>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-head">
            <h3>Notifications</h3>
            <p>Emails sent to your admin address.</p>
          </div>
          <div class="pref-row">
            <span>
              <strong>Availability warnings</strong>
              <small>Tell me when a dish runs out.</small>
            </span>
            <button class="switch" type="button" data-pref="notifyAvailability" aria-pressed="${settings.notifyAvailability}">
              <span class="switch-track"></span>
            </button>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn--primary" type="submit">
            <span data-icon="save"></span>Save changes
          </button>
          <a class="btn btn--ghost" href="#/dashboard">Back to dashboard</a>
          <span class="saved-note" id="savedNote">Saved just now</span>
        </div>
      </form>

      <div class="stack">
        <section class="panel">
          <div class="panel-head">
            <div>
              <h3>Admin accounts</h3>
              <p>Who can sign in to this console</p>
            </div>
          </div>
          <div class="admin-list">${adminRows}</div>
          <form id="addAdminForm" novalidate>
            <div class="field">
              <label for="new-admin-name">Full name</label>
              <input id="new-admin-name" type="text" maxlength="60" placeholder="New admin's name" />
            </div>
            <div class="field">
              <label for="new-admin-email">Email address</label>
              <input id="new-admin-email" type="email" maxlength="80" placeholder="name@restaurant.ph" />
            </div>
            <div class="field">
              <label for="new-admin-password">Temporary password</label>
              <input id="new-admin-password" type="password" autocomplete="new-password"
                placeholder="At least 8 characters" />
            </div>
            <div class="form-actions" style="margin-top:12px">
              <button class="btn btn--primary btn--sm" type="submit">
                <span data-icon="plus"></span>Add admin
              </button>
            </div>
          </form>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <h3>Account</h3>
              <p>Signed in on this device</p>
            </div>
          </div>
          <div class="profile-card">
            ${avatarMarkup(profileAvatar, profileName)}
            <div>
              <strong id="settingsAdminName">${esc(profileName)}</strong>
              <small>Restaurant Administrator</small>
            </div>
          </div>
          <div class="avatar-actions">
            <input id="adminAvatarInput" type="file" accept="image/png,image/jpeg,image/webp" hidden />
            <button class="btn btn--ghost btn--sm" type="button" id="pickAvatar">
              <span data-icon="upload"></span>${profileAvatar ? "Change photo" : "Add photo"}
            </button>
            ${
              profileAvatar
                ? `<button class="btn btn--ghost btn--sm" type="button" id="removeAvatar">Remove photo</button>`
                : ""
            }
          </div>
          <p class="field-hint avatar-hint">Your photo shows in the sidebar and top bar on this browser.</p>
          <div class="pref-row">
            <span>
              <strong>Role</strong>
              <small>Full access to menu and settings</small>
            </span>
            <span class="chip chip--soon">Admin</span>
          </div>
          <div class="pref-row">
            <span>
              <strong>Member since</strong>
              <small>${formatDate(new Date(Date.now() - 240 * 24 * 60 * 60 * 1000).toISOString())}</small>
            </span>
            <span class="chip">Owner</span>
          </div>
        </section>

        <section class="panel danger-card">
          <div class="panel-head">
            <div>
              <h3>Demo data</h3>
              <p>Saved locally in this browser</p>
            </div>
          </div>
          <p class="confirm-text">
            Reset the menu back to the sample restaurant — products, categories and activity. Your current edits will be lost.
          </p>
          <div class="form-actions" style="margin-top:16px">
            <button class="btn btn--ghost btn--sm" type="button" data-action="reset-data">
              <span data-icon="rotate-ccw"></span>Reset demo data
            </button>
          </div>
        </section>
      </div>
    </div>
  `;
}
