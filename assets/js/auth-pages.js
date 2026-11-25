/* Login and registration screens for the admin console. */

import { DEMO_ACCOUNT } from "./auth.js";
import { icon } from "./icons.js";

const ASIDE_PHOTO =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80";

function aside() {
  return `
    <aside class="auth-aside" aria-hidden="true">
      <div class="auth-aside-img">
        <img src="${ASIDE_PHOTO}" alt="" />
      </div>

      <div class="auth-brand">
        <img class="brand-logo" src="assets/images/champz-foodie-logo.webp" alt="Champ'Z Foodie logo" width="44" height="44" />
        <span class="auth-brand-text">
          <strong>Spice Route</strong>
          <small>Admin Console</small>
        </span>
      </div>

      <div class="auth-quote">
        <h2>Run the menu.<br /><em>Own the evening.</em></h2>
        <p>Prices, photography and availability in one place — every change lands on the storefront the moment you save it.</p>
        <ul class="auth-points">
          <li class="auth-point">
            <span class="auth-point-icon">${icon("utensils")}</span>
            Full control of dishes, photos and prices
          </li>
          <li class="auth-point">
            <span class="auth-point-icon">${icon("tags")}</span>
            Categories that keep the menu easy to browse
          </li>
          <li class="auth-point">
            <span class="auth-point-icon">${icon("trending-up")}</span>
            Live availability so nothing sells out silently
          </li>
        </ul>
      </div>

      <p class="auth-aside-foot">© ${new Date().getFullYear()} Spice Route Kitchen</p>
    </aside>
  `;
}

function mobileBrand() {
  return `
    <div class="auth-mobile-brand">
      <img class="brand-logo" src="assets/images/champz-foodie-logo.webp" alt="Champ'Z Foodie logo" width="40" height="40" />
      <span>
        <strong>Spice Route</strong>
        <small>Admin Console</small>
      </span>
    </div>
  `;
}

function alertBox() {
  return `
    <div class="auth-alert" id="authAlert" hidden>
      <span data-icon="alert-triangle"></span>
      <span id="authAlertText"></span>
    </div>
  `;
}

function passwordInput({ id, autocomplete, placeholder, label }) {
  return `
    <div class="field" data-field="${id}">
      <label for="${id}">${label}</label>
      <div class="password-field">
        <input id="${id}" type="password" autocomplete="${autocomplete}" placeholder="${placeholder}" />
        <button class="reveal-btn" type="button" data-toggle-password aria-label="Show password">
          <span data-icon="eye"></span>
        </button>
      </div>
      <span class="field-error" data-error></span>
    </div>
  `;
}

export function loginPage() {
  return `
    <div class="auth-shell">
      ${aside()}
      <main class="auth-panel">
        ${mobileBrand()}
        <div class="auth-card">
          <p class="eyebrow">Admin sign in</p>
          <h1>Welcome back</h1>
          <p class="auth-lede">Sign in to manage your menu, prices and availability.</p>

          ${alertBox()}

          <form class="auth-form" id="loginForm" novalidate>
            <div class="field" data-field="login-email">
              <label for="login-email">Email address</label>
              <input id="login-email" type="email" autocomplete="username"
                placeholder="you@restaurant.ph" autofocus />
              <span class="field-error" data-error>Enter a valid email address.</span>
            </div>

            ${passwordInput({
              id: "login-password",
              autocomplete: "current-password",
              placeholder: "••••••••",
              label: "Password",
            })}

            <button class="btn btn--primary auth-submit" type="submit">
              Sign in <span data-icon="arrow-right"></span>
            </button>
          </form>

          <p class="auth-switch">Admin accounts are added from <strong>Settings → Admin accounts</strong> inside the console.</p>

          <div class="demo-card">
            <strong>Demo access</strong>
            <div class="demo-row"><span>Email</span><code>${DEMO_ACCOUNT.email}</code></div>
            <div class="demo-row"><span>Password</span><code>${DEMO_ACCOUNT.password}</code></div>
            <button class="btn btn--ghost btn--sm" type="button" data-fill-demo>Use demo account</button>
          </div>
        </div>
        <p class="auth-foot">Demo accounts live in this browser only — nothing is sent to a server.</p>
      </main>
    </div>
  `;
}

/** Password reveal toggles + demo credential fill. */
export function bindAuthUI(root) {
  root.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.closest(".password-field")?.querySelector("input");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
      button.innerHTML = icon(show ? "eye-off" : "eye");
    });
  });

  root.querySelector("[data-fill-demo]")?.addEventListener("click", () => {
    const email = root.querySelector("#login-email");
    const password = root.querySelector("#login-password");
    if (email) email.value = DEMO_ACCOUNT.email;
    if (password) password.value = DEMO_ACCOUNT.password;
    root.querySelectorAll(".field.has-error").forEach((field) => field.classList.remove("has-error"));
    const alert = root.querySelector("#authAlert");
    if (alert) alert.hidden = true;
    email?.focus();
  });
}
