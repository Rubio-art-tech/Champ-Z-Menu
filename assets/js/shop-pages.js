/* Storefront page templates. All menu data comes from the shared admin store. */

import { esc, money } from "./format.js";
import { icon } from "./icons.js";
import { store } from "./store.js";

/* Same free-delivery threshold the kitchen advertises on the promo strip. */
const FREE_DELIVERY_OVER = 999;
/* Customers send their orders through Facebook — the storefront has no cart. */
const FACEBOOK_URL = "https://www.facebook.com/people/ChampZ-Foodie/100092515477245/";

export const SORT_OPTIONS = {
  newest: "Newest first",
  popular: "Most popular",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
};

const php = (value) => money(value, "PHP");

function availableProducts() {
  return store.getProducts().filter((product) => product.available);
}

function foodCard(product, { bestseller = false } = {}) {
  return `
    <article class="food-card">
      <button class="food-media" type="button" data-action="open-product" data-id="${product.id}"
        aria-label="View details for ${esc(product.name)}">
        ${product.image ? `<img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy" />` : ""}
        <span class="food-available"><span class="dot"></span>Available</span>
        ${bestseller ? `<span class="food-tag">${icon("flame")}Bestseller</span>` : ""}
      </button>
      <div class="food-body">
        <span class="food-cat">${esc(store.categoryName(product.categoryId))}</span>
        <h3>${esc(product.name)}</h3>
        <p class="food-desc">${esc(product.description || "Freshly prepared by our kitchen.")}</p>
        <div class="food-foot">
          <span class="food-price">${php(product.price)}</span>
        </div>
        <button class="food-details" type="button" data-action="open-product" data-id="${product.id}">
          View details <span data-icon="arrow-right"></span>
        </button>
      </div>
    </article>
  `;
}

function productGrid(products, bestsellers) {
  return `<div class="food-grid">${products
    .map((product) => foodCard(product, { bestseller: bestsellers.has(product.id) }))
    .join("")}</div>`;
}

function bestsellerIds() {
  const popularity = store.popularity();
  if (!popularity.size) return new Set();
  return new Set(
    [...popularity.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id)
  );
}

/* ------------------------------------------------------------------- Home */

export function homePage() {
  const products = availableProducts();
  const categories = store.getCategories();
  const popularity = store.popularity();
  const bestsellers = bestsellerIds();

  const featured = [...products]
    .sort((a, b) => {
      const diff = (popularity.get(b.id) || 0) - (popularity.get(a.id) || 0);
      if (diff !== 0) return diff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    })
    .slice(0, 6);

  const categoryTiles = categories
    .map((category) => {
      const count = products.filter((product) => product.categoryId === category.id).length;
      return `
        <a class="category-tile" href="#/menu?category=${category.id}" style="--tile-tint:${category.tint};--tile-tone:${category.tone}">
          <span class="category-tile-icon" data-icon="${category.icon || "utensils"}"></span>
          <strong>${esc(category.name)}</strong>
          <small>${count} dish${count === 1 ? "" : "es"}</small>
        </a>`;
    })
    .join("");

  return `
    <section class="shop-hero shop-hero--solo">
      <div class="shop-hero-copy">
        <span class="hero-pill"><span class="pulse"></span>Pre-order 2–3 days ahead · Guihulngan City</span>
        <h1>Delicious food,<br /><em>delivered</em> to your door.</h1>
        <p>Chef-crafted comfort food, cooked to order and served 2–3 days after you book. We deliver within Guihulngan City, Vallehermoso and San Carlos City only.</p>
        <div class="hero-actions">
          <a class="btn btn--primary btn--lg" href="#/menu">Order now <span data-icon="arrow-right"></span></a>
          <a class="btn btn--ghost btn--lg" href="#/menu">Explore menu</a>
        </div>
        <div class="hero-proof">
          <span class="hero-stars" aria-hidden="true">★★★★★</span>
          <span><strong>4.9</strong> from 1,200+ happy diners</span>
        </div>
      </div>
    </section>

    <section class="promo">
      <div class="promo-copy">
        <span class="promo-kicker">This week only</span>
        <h2>Free delivery on orders over ${php(FREE_DELIVERY_OVER)}</h2>
        <p>No code needed — just mention it when you order.</p>
      </div>
      <a class="btn btn--primary" href="#/menu">Start an order <span data-icon="arrow-right"></span></a>
    </section>

    <section class="shop-section">
      <div class="shop-section-head">
        <div>
          <p class="shop-eyebrow">Browse the menu</p>
          <h2>What are you craving?</h2>
        </div>
        <a class="shop-link" href="#/menu">Full menu <span data-icon="arrow-right"></span></a>
      </div>
      ${categories.length ? `<div class="category-tiles">${categoryTiles}</div>` : ""}
    </section>

    <section class="shop-section">
      <div class="shop-section-head">
        <div>
          <p class="shop-eyebrow">Kitchen favourites</p>
          <h2>Our most-loved dishes</h2>
        </div>
        <a class="shop-link" href="#/menu">See all ${products.length} dishes <span data-icon="arrow-right"></span></a>
      </div>
      ${
        featured.length
          ? productGrid(featured, bestsellers)
          : `<div class="shop-empty"><span class="empty-icon" data-icon="chef-hat"></span><h3>The menu is being prepared</h3><p>Our kitchen is updating the menu. Please check back shortly.</p></div>`
      }
    </section>

    <section class="how-strip">
      <div class="how-step">
        <span class="how-num">01</span>
        <div><strong>Pick your dishes</strong><p>Browse the live menu and pick what you love.</p></div>
      </div>
      <div class="how-step">
        <span class="how-num">02</span>
        <div><strong>We cook it fresh</strong><p>Every order is prepared after you place it.</p></div>
      </div>
      <div class="how-step">
        <span class="how-num">03</span>
        <div><strong>Served in 2–3 days</strong><p>We cook and deliver on your agreed date.</p></div>
      </div>
    </section>

    <section class="shop-about-teaser shop-about-teaser--solo">
      <div class="shop-about-copy">
        <p class="shop-eyebrow">Our kitchen</p>
        <h2>Real cooking, no shortcuts.</h2>
        <p>Champ'Z Foodie started as a twelve-seat kitchen with one rule: cook everything the way we would for our own family. That rule still runs the pass today.</p>
        <ul class="shop-checks">
          <li><span data-icon="check"></span>Fresh ingredients sourced weekly</li>
          <li><span data-icon="check"></span>Every dish cooked to order</li>
          <li><span data-icon="check"></span>Sealed, insulated delivery bags</li>
        </ul>
        <a class="btn btn--ghost" href="#/about">More about us</a>
      </div>
    </section>
  `;
}

/* ------------------------------------------------------------------- Menu */

export function menuResults(filters) {
  const all = availableProducts();
  const query = filters.q.trim().toLowerCase();
  const bestsellers = bestsellerIds();
  const popularity = store.popularity();

  let results = all.filter((product) => {
    if (filters.category !== "all" && product.categoryId !== filters.category) return false;
    if (!query) return true;
    return `${product.name} ${product.description} ${store.categoryName(product.categoryId)}`
      .toLowerCase()
      .includes(query);
  });

  switch (filters.sort) {
    case "price-asc":
      results = [...results].sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      results = [...results].sort((a, b) => b.price - a.price);
      break;
    case "popular":
      results = [...results].sort(
        (a, b) => (popularity.get(b.id) || 0) - (popularity.get(a.id) || 0)
      );
      break;
    default:
      results = [...results].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const hasFilters = filters.q.trim() !== "" || filters.category !== "all";

  const meta = `
    <div class="menu-meta">
      <span>Showing <strong>${results.length}</strong> of ${all.length} available dish${all.length === 1 ? "" : "es"}</span>
      ${hasFilters ? `<button class="shop-link" type="button" data-action="clear-menu-filters">Clear filters ${icon("x")}</button>` : ""}
    </div>
  `;

  if (!results.length) {
    return `${meta}
      <div class="shop-empty">
        <span class="empty-icon" data-icon="search"></span>
        <h3>No dishes match that search</h3>
        <p>Try a different keyword or browse all categories — the kitchen adds new dishes every week.</p>
        <button class="btn btn--ghost" type="button" data-action="clear-menu-filters">Show all dishes</button>
      </div>`;
  }

  return `${meta}${productGrid(results, bestsellers)}`;
}

export function menuPage(filters) {
  const categories = store.getCategories();
  const products = availableProducts();

  const pills = [
    `<button class="menu-pill ${filters.category === "all" ? "is-on" : ""}" type="button"
      data-category="all">All dishes <span>${products.length}</span></button>`,
    ...categories.map((category) => {
      const count = products.filter((product) => product.categoryId === category.id).length;
      return `<button class="menu-pill ${filters.category === category.id ? "is-on" : ""}" type="button"
        data-category="${category.id}">${esc(category.name)} <span>${count}</span></button>`;
    }),
  ].join("");

  const sortOptions = Object.entries(SORT_OPTIONS)
    .map(
      ([value, label]) =>
        `<option value="${value}" ${filters.sort === value ? "selected" : ""}>${esc(label)}</option>`
    )
    .join("");

  return `
    <section class="shop-page-head menu-head">
      <p class="shop-eyebrow">Our menu</p>
      <h1>Something for every craving.</h1>
      <p>Everything below is cooked to order for the day you need it. Prices in Philippine pesos.</p>
    </section>

    <section class="preorder-note">
      <span class="preorder-icon" data-icon="clock"></span>
      <div class="preorder-copy">
        <strong>Please order at least 2–3 days in advance</strong>
        <p>Our dishes are made to order, so your food is cooked and served 2–3 days after you order. We deliver only within Guihulngan City, Vallehermoso and San Carlos City.</p>
      </div>
      <span class="preorder-tag">2–3 days notice</span>
    </section>

    <section class="how-order" aria-labelledby="howOrderTitle">
      <div class="how-order-head">
        <p class="shop-eyebrow">How to order</p>
        <h2 id="howOrderTitle">Ordering is easy — just 3 steps.</h2>
      </div>
      <ol class="how-order-steps">
        <li>
          <span class="how-order-num">1</span>
          <strong>Pick your food</strong>
          <p>Look through the menu and choose the dishes you like.</p>
        </li>
        <li>
          <span class="how-order-num">2</span>
          <strong>Go to our Facebook page</strong>
          <p>Tap the link below to open our page. You can message us there.</p>
          <a class="shop-link" href="${FACEBOOK_URL}" target="_blank" rel="noopener">Open our Facebook page <span data-icon="arrow-up-right"></span></a>
        </li>
        <li>
          <span class="how-order-num">3</span>
          <strong>Send us your order</strong>
          <p>Send a message, or a screenshot of the food you want, and tell us how many. We will reply to confirm your order and the date.</p>
        </li>
      </ol>
    </section>

    <div class="menu-toolbar">
      <label class="menu-search">
        <span data-icon="search"></span>
        <input type="search" id="menuSearch" placeholder="Search dishes…" value="${esc(filters.q)}"
          autocomplete="off" aria-label="Search dishes" />
      </label>
      <div class="menu-sort">
        <span data-icon="sliders"></span>
        <select id="menuSort" aria-label="Sort dishes">${sortOptions}</select>
      </div>
    </div>

    <div class="menu-pills" role="group" aria-label="Filter by category">${pills}</div>

    <section id="menuResults" aria-live="polite">${menuResults(filters)}</section>
  `;
}

/* ------------------------------------------------------------------ About */

export function aboutPage() {
  return `
    <section class="shop-page-head">
      <p class="shop-eyebrow">About us</p>
      <h1>Twelve seats, one very stubborn rule.</h1>
      <p>We cook every plate the way we would for our own family — no shortcuts, no reheated shortcuts.</p>
    </section>

    <section class="about-split about-split--solo">
      <div class="about-story">
        <h2>From a small kitchen to your table</h2>
        <p>Champ'Z Foodie opened in 2019 as a twelve-seat room off a side street in Guihulngan City. The menu was four dishes long and the kitchen was barely wide enough for two cooks.</p>
        <p>Seven years later we still work the same way: a small menu, cooked to order, using produce we pick up ourselves. The only thing that changed is that we now pack it into insulated bags and send it to Guihulngan City, Vallehermoso and San Carlos City.</p>
        <div class="about-stats">
          <div><strong>7</strong><span>Years cooking</span></div>
          <div><strong>12k+</strong><span>Orders delivered</span></div>
          <div><strong>4.9</strong><span>Average rating</span></div>
        </div>
      </div>
    </section>

    <section class="shop-section">
      <div class="shop-section-head">
        <div>
          <p class="shop-eyebrow">What we stand for</p>
          <h2>The things we refuse to compromise</h2>
        </div>
      </div>
      <div class="value-grid">
        <article class="value-card">
          <span class="value-icon" data-icon="leaf"></span>
          <h3>Real ingredients</h3>
          <p>Sauces are built from scratch, stocks simmer overnight, and produce arrives fresh twice a week.</p>
        </article>
        <article class="value-card">
          <span class="value-icon" data-icon="flame"></span>
          <h3>Cooked to order</h3>
          <p>Nothing sits under a lamp. Your dish starts when your order lands on the pass.</p>
        </article>
        <article class="value-card">
          <span class="value-icon" data-icon="truck"></span>
          <h3>Delivered with care</h3>
          <p>Sealed, insulated packaging and riders who know the neighbourhood streets.</p>
        </article>
      </div>
    </section>

    <section class="about-cta">
      <div>
        <h2>Hungry yet?</h2>
        <p>The full menu is live — order 2–3 days ahead and we'll have it ready.</p>
      </div>
      <a class="btn btn--primary btn--lg" href="#/menu">Browse the menu <span data-icon="arrow-right"></span></a>
    </section>
  `;
}

/* ---------------------------------------------------------------- Contact */

export function contactPage() {
  const settings = store.getSettings();
  const multiline = (text) => esc(text || "").replace(/\n/g, "<br />");
  const phone = settings.contactPhone || "";
  const email = settings.contactEmail || "";
  return `
    <section class="shop-page-head">
      <p class="shop-eyebrow">Contact</p>
      <h1>Say hello.</h1>
      <p>Questions about an order, a large booking or a dish? We answer every message.</p>
    </section>

    <div class="contact-grid">
      <div class="contact-cards">
        <article class="contact-card">
          <span class="contact-icon" data-icon="map-pin"></span>
          <div><strong>Kitchen</strong><p>${multiline(settings.contactAddress)}</p></div>
        </article>
        <article class="contact-card">
          <span class="contact-icon" data-icon="truck"></span>
          <div><strong>Delivery area</strong><p>Guihulngan City, Vallehermoso<br />and San Carlos City only</p></div>
        </article>
        <article class="contact-card">
          <span class="contact-icon" data-icon="phone"></span>
          <div><strong>Call or text</strong><p><a href="tel:${esc(phone.replace(/[^\d+]/g, ""))}">${esc(phone)}</a></p></div>
        </article>
        <article class="contact-card">
          <span class="contact-icon" data-icon="mail"></span>
          <div><strong>Email</strong><p><a href="mailto:${esc(email)}">${esc(email)}</a></p></div>
        </article>
        <article class="contact-card">
          <span class="contact-icon" data-icon="clock"></span>
          <div><strong>Hours</strong><p>${multiline(settings.contactHours)}</p></div>
        </article>
      </div>

      <section class="shop-panel contact-form-panel">
        <h2>Send us a message</h2>
        <p class="panel-lede">We usually reply within a few hours during kitchen hours.</p>
        <form id="contactForm" class="shop-form" novalidate>
          <div class="field" data-field="contact-name">
            <label for="contact-name">Your name</label>
            <input id="contact-name" type="text" placeholder="Full name" autocomplete="name" />
            <span class="field-error" data-error>Please enter your name.</span>
          </div>
          <div class="field" data-field="contact-email">
            <label for="contact-email">Email address</label>
            <input id="contact-email" type="email" placeholder="you@email.com" autocomplete="email" />
            <span class="field-error" data-error>Enter a valid email address.</span>
          </div>
          <div class="field" data-field="contact-message">
            <label for="contact-message">Message</label>
            <textarea id="contact-message" rows="4" placeholder="How can we help?"></textarea>
            <span class="field-error" data-error>Write a short message.</span>
          </div>
          <button class="btn btn--primary btn--block" type="submit">Send message</button>
        </form>
      </section>
    </div>
  `;
}
