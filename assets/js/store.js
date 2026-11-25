/* Data layer for the admin console.
   Everything is kept in localStorage so the dashboard behaves like a real
   management tool across reloads, with no server required for this phase. */

import { money } from "./format.js";
import { pushState } from "./live-sync.js";
import { toast } from "./ui.js";

const STORAGE_KEY = "spiceroute.admin.v1";

export const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Ready for Delivery",
  "Out for Delivery",
  "Completed",
  "Cancelled",
];

const uid = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ago = (ms) => new Date(Date.now() - ms).toISOString();

const PHOTO = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

const CATEGORY_TINTS = [
  { tone: "#d64f0c", tint: "#ffe9d9" },
  { tone: "#b23c30", tint: "#fdeae7" },
  { tone: "#9a6a12", tint: "#fff3da" },
  { tone: "#1f7a53", tint: "#e2f5ec" },
  { tone: "#95467c", tint: "#faeaf6" },
  { tone: "#3a67a2", tint: "#e8f0fb" },
  { tone: "#5a5340", tint: "#f1ece0" },
];

function seedCategories() {
  return [
    { id: "cat_mains", name: "Mains", icon: "utensils", ...CATEGORY_TINTS[0] },
    { id: "cat_burgers", name: "Burgers", icon: "flame", ...CATEGORY_TINTS[1] },
    { id: "cat_pasta", name: "Pasta", icon: "soup", ...CATEGORY_TINTS[2] },
    { id: "cat_salads", name: "Salads", icon: "leaf", ...CATEGORY_TINTS[3] },
    { id: "cat_desserts", name: "Desserts", icon: "cake", ...CATEGORY_TINTS[4] },
    { id: "cat_drinks", name: "Drinks", icon: "coffee", ...CATEGORY_TINTS[5] },
  ];
}

function seedProducts() {
  return [
    {
      id: "prd_1",
      name: "Smoky BBQ Bacon Burger",
      price: 289,
      description: "Double-smashed beef, candied bacon, aged cheddar and our house bourbon BBQ glaze.",
      categoryId: "cat_burgers",
      image: PHOTO("1568901346375-23c9450c58cd"),
      available: true,
      createdAt: ago(3 * HOUR),
      updatedAt: ago(3 * HOUR),
    },
    {
      id: "prd_2",
      name: "Truffle Mushroom Pasta",
      price: 345,
      description: "Fettuccine tossed in a parmesan cream with black truffle, thyme and roasted mushrooms.",
      categoryId: "cat_pasta",
      image: PHOTO("1621996346565-e3dbc646d9a9"),
      available: true,
      createdAt: ago(9 * HOUR),
      updatedAt: ago(9 * HOUR),
    },
    {
      id: "prd_3",
      name: "Margherita Pizza",
      price: 420,
      description: "48-hour cold-proofed dough, San Marzano tomatoes, fior di latte and fresh basil.",
      categoryId: "cat_mains",
      image: PHOTO("1513104890138-7c749659a591"),
      available: true,
      createdAt: ago(1 * DAY + 2 * HOUR),
      updatedAt: ago(1 * DAY),
    },
    {
      id: "prd_4",
      name: "Garden Crunch Salad",
      price: 240,
      description: "Baby greens, heirloom tomato, cucumber ribbons, feta and a citrus honey vinaigrette.",
      categoryId: "cat_salads",
      image: PHOTO("1512621776951-a57141f2eefd"),
      available: true,
      createdAt: ago(2 * DAY),
      updatedAt: ago(2 * DAY),
    },
    {
      id: "prd_5",
      name: "Salmon Sushi Platter",
      price: 580,
      description: "Twelve pieces of hand-pressed nigiri and maki, finished with yuzu soy and sesame.",
      categoryId: "cat_mains",
      image: PHOTO("1579871494447-9811cf80d66c"),
      available: false,
      createdAt: ago(3 * DAY),
      updatedAt: ago(6 * HOUR),
    },
    {
      id: "prd_6",
      name: "Street Beef Tacos",
      price: 210,
      description: "Three corn tortillas with slow-braised beef, pickled onion, cilantro and salsa verde.",
      categoryId: "cat_mains",
      image: PHOTO("1565299585323-38d6b0865b47"),
      available: true,
      createdAt: ago(4 * DAY),
      updatedAt: ago(4 * DAY),
    },
    {
      id: "prd_7",
      name: "Crispy Buttermilk Chicken",
      price: 315,
      description: "24-hour buttermilk brine, double-fried for crunch, served with spiced honey.",
      categoryId: "cat_mains",
      image: PHOTO("1562967914-608f82629710"),
      available: true,
      createdAt: ago(5 * DAY),
      updatedAt: ago(5 * DAY),
    },
    {
      id: "prd_8",
      name: "Spicy Tonkotsu Ramen",
      price: 380,
      description: "18-hour pork broth, chashu, ajitama egg, chili oil and spring onion.",
      categoryId: "cat_mains",
      image: PHOTO("1569718212165-3a8278d5f624"),
      available: true,
      createdAt: ago(6 * DAY),
      updatedAt: ago(6 * DAY),
    },
    {
      id: "prd_9",
      name: "Buttermilk Pancake Stack",
      price: 195,
      description: "Fluffy pancakes with maple butter, candied pecans and a berry compote.",
      categoryId: "cat_desserts",
      image: PHOTO("1567620905732-2d1ec7ab7445"),
      available: true,
      createdAt: ago(7 * DAY),
      updatedAt: ago(7 * DAY),
    },
    {
      id: "prd_10",
      name: "Chocolate Fudge Cake",
      price: 175,
      description: "Dark chocolate sponge layered with silky ganache and a pinch of sea salt.",
      categoryId: "cat_desserts",
      image: PHOTO("1578985545062-69928b1d9587"),
      available: true,
      createdAt: ago(8 * DAY),
      updatedAt: ago(8 * DAY),
    },
    {
      id: "prd_11",
      name: "Iced Espresso Tonic",
      price: 145,
      description: "Double espresso poured over tonic, lime and orange peel. Bright and bubbly.",
      categoryId: "cat_drinks",
      image: PHOTO("1495474472287-4d71bcdd2085"),
      available: true,
      createdAt: ago(9 * DAY),
      updatedAt: ago(9 * DAY),
    },
    {
      id: "prd_12",
      name: "Berry Protein Smoothie",
      price: 165,
      description: "Strawberry, blueberry, banana and Greek yogurt blended with a scoop of whey.",
      categoryId: "cat_drinks",
      image: PHOTO("1505252585461-04db1eb84625"),
      available: false,
      createdAt: ago(10 * DAY),
      updatedAt: ago(2 * DAY),
    },
  ];
}

function seedActivity() {
  return [
    { id: "act_1", kind: "create", text: "Added <strong>Smoky BBQ Bacon Burger</strong> to the menu", at: ago(3 * HOUR) },
    { id: "act_2", kind: "toggle", text: "Marked <strong>Salmon Sushi Platter</strong> as unavailable", at: ago(6 * HOUR) },
    { id: "act_3", kind: "update", text: "Updated the price of <strong>Truffle Mushroom Pasta</strong>", at: ago(9 * HOUR) },
    { id: "act_4", kind: "category", text: "Renamed the <strong>Drinks</strong> category", at: ago(1 * DAY + 4 * HOUR) },
    { id: "act_5", kind: "toggle", text: "Marked <strong>Berry Protein Smoothie</strong> as unavailable", at: ago(2 * DAY) },
  ];
}

function seedState() {
  return {
    products: seedProducts(),
    categories: seedCategories(),
    orders: [],
    activity: seedActivity(),
    settings: {
      restaurantName: "Spice Route Kitchen",
      adminName: "Ava Reyes",
      adminEmail: "ava@spiceroute.ph",
      currency: "PHP",
      notifyOrders: true,
      notifyAvailability: true,
      contactAddress: "Unit 4, 118 Dela Rosa Street\nGuihulngan City, Negros Oriental",
      contactPhone: "0917 555 0123",
      contactEmail: "hello@spiceroute.ph",
      contactHours: "Tue – Sun · 10:00 AM – 10:00 PM",
    },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.products) || !Array.isArray(parsed.categories)) {
      return seedState();
    }
    return {
      products: parsed.products,
      categories: parsed.categories,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      activity: Array.isArray(parsed.activity) ? parsed.activity : [],
      settings: { ...seedState().settings, ...(parsed.settings || {}) },
    };
  } catch {
    return seedState();
  }
}

const state = load();

function persist() {
  const json = JSON.stringify(state);
  try {
    localStorage.setItem(STORAGE_KEY, json);
    // Hand the same snapshot to the other app window (and other browsers).
    pushState(json);
    return true;
  } catch (error) {
    console.warn("Could not save menu data to this browser.", error);
    // Never let a save fail silently: the change would vanish on reload.
    toast("This browser's storage is full — that change wasn't saved. Free up space or use a smaller photo.", "error");
    return false;
  }
}

function log(kind, text) {
  state.activity.unshift({ id: uid("act"), kind, text, at: new Date().toISOString() });
  state.activity = state.activity.slice(0, 40);
}

function normalizeProduct(data) {
  return {
    name: String(data.name || "").trim(),
    price: Math.max(0, Number(data.price) || 0),
    description: String(data.description || "").trim(),
    categoryId: data.categoryId || null,
    image: String(data.image || "").trim(),
    available: Boolean(data.available),
  };
}

const ACTIVITY_META = {
  create: { icon: "plus", tone: "var(--green)" },
  update: { icon: "pencil", tone: "var(--brand-deep)" },
  delete: { icon: "trash", tone: "var(--red)" },
  toggle: { icon: "power", tone: "var(--amber)" },
  category: { icon: "tags", tone: "#95467c" },
  settings: { icon: "sliders", tone: "#3a67a2" },
  order: { icon: "shopping-bag", tone: "var(--brand)" },
};

function priceLabel(price) {
  return money(price, state.settings.currency);
}

export const store = {
  getProducts() {
    return [...state.products];
  },

  getProduct(id) {
    return state.products.find((product) => product.id === id) || null;
  },

  addProduct(data) {
    const payload = normalizeProduct(data);
    const now = new Date().toISOString();
    const product = { id: uid("prd"), ...payload, createdAt: now, updatedAt: now };
    state.products.unshift(product);
    log("create", `Added <strong>${product.name}</strong> to the menu at ${priceLabel(product.price)}`);
    persist();
    return product;
  },

  updateProduct(id, data) {
    const product = state.products.find((item) => item.id === id);
    if (!product) return null;
    const payload = normalizeProduct(data);
    const priceChanged = product.price !== payload.price;
    Object.assign(product, payload, { updatedAt: new Date().toISOString() });
    log(
      "update",
      priceChanged
        ? `Updated the price of <strong>${product.name}</strong> to ${priceLabel(product.price)}`
        : `Updated the details of <strong>${product.name}</strong>`
    );
    persist();
    return product;
  },

  deleteProduct(id) {
    const index = state.products.findIndex((product) => product.id === id);
    if (index === -1) return null;
    const [removed] = state.products.splice(index, 1);
    log("delete", `Removed <strong>${removed.name}</strong> from the menu`);

    // Deleting the last dish in a category takes the empty category with it.
    let removedCategory = null;
    const stillUsed = state.products.some(
      (product) => product.categoryId === removed.categoryId
    );
    if (removed.categoryId && !stillUsed) {
      const categoryIndex = state.categories.findIndex(
        (category) => category.id === removed.categoryId
      );
      if (categoryIndex !== -1) {
        removedCategory = state.categories.splice(categoryIndex, 1)[0];
        log(
          "category",
          `Deleted the empty <strong>${removedCategory.name}</strong> category`
        );
      }
    }

    persist();
    return { product: removed, category: removedCategory };
  },

  toggleProduct(id) {
    const product = state.products.find((item) => item.id === id);
    if (!product) return null;
    product.available = !product.available;
    product.updatedAt = new Date().toISOString();
    log(
      "toggle",
      `Marked <strong>${product.name}</strong> as ${product.available ? "available" : "unavailable"}`
    );
    persist();
    return product;
  },

  getCategories() {
    return [...state.categories];
  },

  categoryById(id) {
    return state.categories.find((category) => category.id === id) || null;
  },

  categoryName(id) {
    return this.categoryById(id)?.name || "Uncategorized";
  },

  addCategory(name) {
    const clean = String(name || "").trim();
    if (!clean) return { ok: false, error: "Give the category a name." };
    if (state.categories.some((category) => category.name.toLowerCase() === clean.toLowerCase())) {
      return { ok: false, error: "That category already exists." };
    }
    const palette = CATEGORY_TINTS[state.categories.length % CATEGORY_TINTS.length];
    const category = { id: uid("cat"), name: clean, icon: "tags", ...palette };
    state.categories.push(category);
    log("category", `Created the <strong>${clean}</strong> category`);
    persist();
    return { ok: true, category };
  },

  renameCategory(id, name) {
    const category = state.categories.find((item) => item.id === id);
    if (!category) return { ok: false, error: "Category not found." };
    const clean = String(name || "").trim();
    if (!clean) return { ok: false, error: "Give the category a name." };
    if (
      state.categories.some(
        (item) => item.id !== id && item.name.toLowerCase() === clean.toLowerCase()
      )
    ) {
      return { ok: false, error: "Another category already uses that name." };
    }
    category.name = clean;
    log("category", `Renamed a category to <strong>${clean}</strong>`);
    persist();
    return { ok: true, category };
  },

  deleteCategory(id) {
    const inUse = state.products.filter((product) => product.categoryId === id).length;
    if (inUse > 0) {
      return {
        ok: false,
        error: `Move or delete the ${inUse} dish${inUse === 1 ? "" : "es"} in this category first.`,
      };
    }
    const index = state.categories.findIndex((category) => category.id === id);
    if (index === -1) return { ok: false, error: "Category not found." };
    const [removed] = state.categories.splice(index, 1);
    log("category", `Deleted the <strong>${removed.name}</strong> category`);
    persist();
    return { ok: true, category: removed };
  },

  /* ------------------------------------------------------------- Orders */

  getOrders() {
    return [...state.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  getOrder(id) {
    return state.orders.find((order) => order.id === id) || null;
  },

  getOrdersForCustomer(userId) {
    return this.getOrders().filter((order) => order.customerUserId === userId);
  },

  placeOrder(payload) {
    // Pick up orders other tabs saved before numbering this one.
    this.reload();

    const now = new Date();
    const prefix = `SR-${now.getFullYear()}-`;
    const lastNumber = state.orders.reduce((max, order) => {
      const value = String(order.number || "");
      if (!value.startsWith(prefix)) return max;
      const seq = Number(value.slice(prefix.length));
      return Number.isFinite(seq) ? Math.max(max, seq) : max;
    }, 0);
    const number = `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
    const order = {
      id: uid("ord"),
      number,
      status: "Pending",
      createdAt: now.toISOString(),
      ...payload,
    };
    state.orders.unshift(order);
    log(
      "order",
      `New order <strong>${number}</strong> from ${order.customerName} · ${priceLabel(order.total)}`
    );
    persist();
    return order;
  },

  updateOrderStatus(id, status) {
    const order = state.orders.find((item) => item.id === id);
    if (!order) return null;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    log("order", `Order <strong>${order.number}</strong> marked ${status}`);
    persist();
    return order;
  },

  /** Quantity sold per product, used for the customer "most popular" sort. */
  popularity() {
    const counts = new Map();
    state.orders
      .filter((order) => order.status !== "Cancelled")
      .forEach((order) => {
        (order.items || []).forEach((item) => {
          counts.set(item.productId, (counts.get(item.productId) || 0) + (item.qty || 0));
        });
      });
    return counts;
  },

  getActivity(limit = 5) {
    return state.activity.slice(0, limit).map((entry) => ({
      ...entry,
      meta: ACTIVITY_META[entry.kind] || ACTIVITY_META.update,
    }));
  },

  log,

  getSettings() {
    return { ...state.settings };
  },

  saveSettings(patch) {
    state.settings = { ...state.settings, ...patch };
    log("settings", "Updated the restaurant profile");
    persist();
    return this.getSettings();
  },

  /** Keep the displayed admin identity in sync with the signed-in account. */
  adoptAccount({ name, email }) {
    if (name) state.settings.adminName = name;
    if (email) state.settings.adminEmail = email;
    persist();
  },

  stats() {
    const products = state.products;
    const available = products.filter((product) => product.available).length;
    return {
      total: products.length,
      available,
      unavailable: products.length - available,
      categories: state.categories.length,
      availablePct: products.length ? Math.round((available / products.length) * 100) : 0,
    };
  },

  /** Re-read data written by another tab (storefront ↔ admin console). */
  reload() {
    const fresh = load();
    state.products = fresh.products;
    state.categories = fresh.categories;
    state.orders = fresh.orders;
    state.activity = fresh.activity;
    state.settings = fresh.settings;
    return state;
  },

  reset() {
    const fresh = seedState();
    const orders = state.orders;
    state.products = fresh.products;
    state.categories = fresh.categories;
    // Customer orders are live data, not demo content — keep them.
    state.orders = orders;
    state.activity = fresh.activity;
    state.settings = fresh.settings;
    persist();
  },
};
