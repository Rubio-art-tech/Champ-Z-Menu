/* Small UI primitives: toasts, modals and confirmation dialogs. */

import { esc } from "./format.js";
import { hydrateIcons, icon } from "./icons.js";

const modalRoot = () => document.getElementById("modalRoot");
const toastRoot = () => document.getElementById("toastRoot");

let lastFocused = null;

/* ---------------------------------------------------------------- Toasts */

export function toast(message, tone = "success") {
  const root = toastRoot();
  if (!root) return;

  const iconName = tone === "error" ? "alert-triangle" : tone === "info" ? "sparkles" : "check-circle";
  const node = document.createElement("div");
  node.className = `toast toast--${tone}`;
  node.setAttribute("role", tone === "error" ? "alert" : "status");
  node.innerHTML = `<span class="toast-icon">${icon(iconName)}</span><span>${esc(message)}</span>`;
  root.appendChild(node);

  window.setTimeout(() => {
    node.classList.add("is-leaving");
    window.setTimeout(() => node.remove(), 260);
  }, 3200);
}

/* ---------------------------------------------------------------- Modals */

export function closeModal() {
  const root = modalRoot();
  if (!root) return;
  root.innerHTML = "";
  document.body.style.overflow = "";
  if (lastFocused && typeof lastFocused.focus === "function") {
    lastFocused.focus({ preventScroll: true });
  }
  lastFocused = null;
}

export function openModal({ title, subtitle = "", iconName = "utensils", size = "", body = "", footer = "", onMount }) {
  const root = modalRoot();
  if (!root) return;

  lastFocused = document.activeElement;
  root.innerHTML = `
    <div class="modal-backdrop" data-modal-backdrop>
      <div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-head">
          <span class="modal-head-icon" data-dialog-tone>${icon(iconName)}</span>
          <div class="modal-head-text">
            <h2 id="modalTitle">${esc(title)}</h2>
            ${subtitle ? `<p>${esc(subtitle)}</p>` : ""}
          </div>
          <button class="modal-close" type="button" data-close-modal aria-label="Close dialog">${icon("x")}</button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ""}
      </div>
    </div>
  `;

  document.body.style.overflow = "hidden";
  hydrateIcons(root);

  root.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });
  root.querySelector("[data-modal-backdrop]").addEventListener("mousedown", (event) => {
    if (event.target === event.currentTarget) closeModal();
  });

  const dialog = root.querySelector(".modal");
  if (dialog) {
    const focusable = dialog.querySelector(
      "input:not([type=hidden]):not([type=file]), textarea, select, button:not([data-close-modal])"
    );
    window.setTimeout(() => focusable?.focus({ preventScroll: true }), 60);
  }

  if (typeof onMount === "function") onMount(root);
  return root.querySelector(".modal");
}

export function setModalTone(tone = "danger") {
  const el = modalRoot()?.querySelector("[data-dialog-tone]");
  if (el) el.classList.toggle("is-danger", tone === "danger");
}

export function confirmDialog({ title, message, confirmLabel = "Confirm", tone = "danger", iconName = "alert-triangle", onConfirm }) {
  openModal({
    title,
    iconName,
    size: "modal--narrow",
    body: `<p class="confirm-text">${message}</p>`,
    footer: `
      <button class="btn btn--ghost" type="button" data-close-modal>Cancel</button>
      <button class="btn ${tone === "danger" ? "btn--danger" : "btn--primary"}" type="button" data-confirm>${esc(
      confirmLabel
    )}</button>
    `,
    onMount(root) {
      if (tone === "danger") setModalTone("danger");
      root.querySelector("[data-confirm]")?.addEventListener("click", () => {
        closeModal();
        onConfirm?.();
      });
    },
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modalRoot()?.childElementCount) closeModal();
});
