/* Modal forms: add/edit a dish, create/rename a category, delete confirmations. */

import { esc } from "./format.js";
import { hydrateIcons } from "./icons.js";
import { store } from "./store.js";
import { closeModal, confirmDialog, openModal, toast } from "./ui.js";

const MAX_UPLOAD_BYTES = 1.2 * 1024 * 1024;

function setFieldError(root, name, message) {
  const field = root.querySelector(`[data-field="${name}"]`);
  if (!field) return;
  field.classList.toggle("has-error", Boolean(message));
  const error = field.querySelector("[data-error]");
  if (error && message) error.textContent = message;
}

function clearErrors(root) {
  root.querySelectorAll(".field.has-error").forEach((field) => field.classList.remove("has-error"));
}

/* ------------------------------------------------------------- Product form */

export function openProductForm(id = null, onSaved) {
  const existing = id ? store.getProduct(id) : null;
  const categories = store.getCategories();
  let imageValue = existing?.image || "";
  let available = existing ? existing.available : true;

  const options = categories.length
    ? categories
        .map(
          (category) =>
            `<option value="${esc(category.id)}" ${
              existing?.categoryId === category.id ? "selected" : ""
            }>${esc(category.name)}</option>`
        )
        .join("")
    : `<option value="">No categories yet — add one below</option>`;

  const body = `
    <form id="productForm" class="form-section" novalidate>
      <div class="field" data-field="name">
        <label for="pf-name">Product name <span class="req">*</span></label>
        <input id="pf-name" name="name" type="text" maxlength="80" autocomplete="off"
          placeholder="e.g. Smoky BBQ Bacon Burger" value="${esc(existing?.name || "")}" />
        <span class="field-error" data-error>Please enter a product name.</span>
      </div>

      <div class="form-row">
        <div class="field" data-field="price">
          <label for="pf-price">Price (₱) <span class="req">*</span></label>
          <input id="pf-price" name="price" type="number" min="0" step="0.01" inputmode="decimal"
            placeholder="0.00" value="${existing ? Number(existing.price).toFixed(2) : ""}" />
          <span class="field-error" data-error>Enter a price greater than zero.</span>
        </div>
        <div class="field" data-field="category">
          <label for="pf-category">Category <span class="req">*</span></label>
          <select id="pf-category" name="categoryId">${options}</select>
          <div class="inline-add" id="pf-cat-add" hidden>
            <input id="pf-cat-name" type="text" maxlength="40" autocomplete="off"
              placeholder="New category name" aria-label="New category name" />
            <button class="btn btn--primary btn--sm" type="button" id="pf-cat-save">Add</button>
            <button class="btn btn--ghost btn--sm" type="button" id="pf-cat-cancel">Cancel</button>
          </div>
          <button class="link-btn" type="button" id="pf-new-category">
            <span data-icon="plus"></span>Add new category
          </button>
          <span class="field-error" data-error>Choose a category.</span>
        </div>
      </div>

      <div class="field" data-field="description">
        <label for="pf-desc">Description</label>
        <textarea id="pf-desc" name="description" maxlength="320" rows="3"
          placeholder="What makes this dish worth ordering?">${esc(existing?.description || "")}</textarea>
        <span class="field-hint"><span id="pf-desc-count">0</span>/320 characters</span>
      </div>

      <div class="field" data-field="image">
        <span class="field-label">Food photo</span>
        <div class="image-picker">
          <div class="image-preview" id="pf-preview"></div>
          <div class="image-fields">
            <button class="upload-btn" type="button" id="pf-upload">
              <span data-icon="upload"></span> Upload a photo
            </button>
            <input id="pf-file" type="file" accept="image/*" hidden />
            <input id="pf-image" type="url" placeholder="…or paste an image URL"
              value="${esc(imageValue.startsWith("data:") ? "" : imageValue)}" />
            <span class="field-hint">JPG, PNG or WebP up to 1.2 MB — or any hosted image link.</span>
          </div>
        </div>
        <span class="field-error" data-error>That photo could not be loaded.</span>
      </div>

      <div class="form-switch-row">
        <span>
          <strong>Available for ordering</strong>
          <small>Unavailable dishes stay on the menu but cannot be ordered.</small>
        </span>
        <button class="switch" type="button" id="pf-availability" aria-pressed="${available}">
          <span class="switch-track"></span>
          <span id="pf-availability-label">${available ? "Available" : "Unavailable"}</span>
        </button>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn--ghost" type="button" data-close-modal>Cancel</button>
    <button class="btn btn--primary" type="submit" form="productForm">
      <span data-icon="save"></span>${existing ? "Save changes" : "Add to menu"}
    </button>
  `;

  const modal = openModal({
    title: existing ? "Edit dish" : "Add new dish",
    subtitle: existing
      ? "Update the price, photo or availability of this dish."
      : "New dishes appear on the storefront menu immediately.",
    iconName: "utensils",
    size: "modal--wide",
    body,
    footer,
    onMount(root) {
      const form = root.querySelector("#productForm");
      const preview = root.querySelector("#pf-preview");
      const urlInput = root.querySelector("#pf-image");
      const fileInput = root.querySelector("#pf-file");
      const count = root.querySelector("#pf-desc-count");
      const desc = root.querySelector("#pf-desc");
      const availability = root.querySelector("#pf-availability");
      const availabilityLabel = root.querySelector("#pf-availability-label");

      const paintPreview = (src) => {
        if (!src) {
          preview.innerHTML = `
            <div class="preview-empty">
              <span data-icon="image"></span>
              <span>No photo yet</span>
            </div>`;
          hydrateIcons(preview);
          return;
        }
        preview.innerHTML = `<img src="${esc(src)}" alt="Dish photo preview" />`;
        preview.querySelector("img").addEventListener("error", () => {
          imageValue = "";
          paintPreview("");
          setFieldError(root, "image", "That photo could not be loaded. Try another link.");
        });
      };

      const refreshCount = () => {
        count.textContent = String((desc.value || "").length);
      };

      paintPreview(imageValue);
      refreshCount();

      desc.addEventListener("input", refreshCount);

      let urlTimer = 0;
      urlInput.addEventListener("input", () => {
        window.clearTimeout(urlTimer);
        urlTimer = window.setTimeout(() => {
          imageValue = urlInput.value.trim();
          setFieldError(root, "image", "");
          paintPreview(imageValue);
        }, 350);
      });

      root.querySelector("#pf-upload").addEventListener("click", () => fileInput.click());

      fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
          toast("Choose an image file (JPG, PNG or WebP).", "error");
          fileInput.value = "";
          return;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          toast("That photo is over 1.2 MB. Pick a smaller file or use an image URL.", "error");
          fileInput.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          imageValue = String(reader.result || "");
          urlInput.value = "";
          setFieldError(root, "image", "");
          paintPreview(imageValue);
        };
        reader.readAsDataURL(file);
      });

      availability.addEventListener("click", () => {
        available = !available;
        availability.setAttribute("aria-pressed", String(available));
        availabilityLabel.textContent = available ? "Available" : "Unavailable";
      });

      /* Create a category without leaving the dish form. */
      const catSelect = root.querySelector("#pf-category");
      const catRow = root.querySelector("#pf-cat-add");
      const catName = root.querySelector("#pf-cat-name");
      const newCatBtn = root.querySelector("#pf-new-category");

      const toggleCatRow = (open) => {
        catRow.hidden = !open;
        newCatBtn.hidden = open;
        if (open) {
          catName.value = "";
          catName.focus();
        }
      };

      newCatBtn.addEventListener("click", () => toggleCatRow(true));
      root.querySelector("#pf-cat-cancel").addEventListener("click", () => toggleCatRow(false));

      const createCategory = () => {
        const result = store.addCategory(catName.value);
        if (!result.ok) {
          toast(result.error, "error");
          catName.focus();
          catName.select();
          return;
        }
        const option = document.createElement("option");
        option.value = result.category.id;
        option.textContent = result.category.name;
        catSelect.appendChild(option);
        catSelect.value = result.category.id;
        setFieldError(root, "category", "");
        toggleCatRow(false);
        toast(`"${result.category.name}" created and selected.`);
      };

      root.querySelector("#pf-cat-save").addEventListener("click", createCategory);
      catName.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          createCategory();
        }
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearErrors(root);

        const name = root.querySelector("#pf-name").value.trim();
        const price = Number(root.querySelector("#pf-price").value);
        const categoryId = root.querySelector("#pf-category").value;
        const description = desc.value.trim();

        let firstInvalid = null;

        if (name.length < 2) {
          setFieldError(root, "name", "Please enter a product name.");
          firstInvalid = firstInvalid || root.querySelector("#pf-name");
        }
        if (!Number.isFinite(price) || price <= 0) {
          setFieldError(root, "price", "Enter a price greater than zero.");
          firstInvalid = firstInvalid || root.querySelector("#pf-price");
        }
        if (!categoryId || !store.categoryById(categoryId)) {
          setFieldError(root, "category", "Choose a category.");
          firstInvalid = firstInvalid || root.querySelector("#pf-category");
        }

        if (firstInvalid) {
          firstInvalid.focus();
          return;
        }

        const payload = {
          name,
          price,
          categoryId,
          description,
          image: imageValue,
          available,
        };

        if (existing) {
          store.updateProduct(existing.id, payload);
          toast(`"${name}" updated.`);
        } else {
          store.addProduct(payload);
          toast(`"${name}" added to the menu.`);
        }

        closeModal();
        onSaved?.();
      });
    },
  });

  if (modal) hydrateIcons(modal);
}

/* ------------------------------------------------------------ Category form */

export function openCategoryForm(category = null, onSaved) {
  const body = `
    <form id="categoryForm" class="form-section" novalidate>
      <div class="field" data-field="categoryName">
        <label for="cf-name">Category name <span class="req">*</span></label>
        <input id="cf-name" type="text" maxlength="40" autocomplete="off"
          placeholder="e.g. Rice Bowls" value="${esc(category?.name || "")}" />
        <span class="field-hint">Group dishes so guests can browse the menu faster.</span>
        <span class="field-error" data-error>Give the category a name.</span>
      </div>
    </form>
  `;

  openModal({
    title: category ? "Rename category" : "New category",
    subtitle: category ? "Changes apply everywhere this category is used." : "Add a new section to your menu.",
    iconName: "tags",
    size: "modal--narrow",
    body,
    footer: `
      <button class="btn btn--ghost" type="button" data-close-modal>Cancel</button>
      <button class="btn btn--primary" type="submit" form="categoryForm">
        <span data-icon="check"></span>${category ? "Save name" : "Create category"}
      </button>
    `,
    onMount(root) {
      const form = root.querySelector("#categoryForm");
      const input = root.querySelector("#cf-name");

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearErrors(root);
        const result = category ? store.renameCategory(category.id, input.value) : store.addCategory(input.value);

        if (!result.ok) {
          setFieldError(root, "categoryName", result.error);
          input.focus();
          return;
        }

        toast(category ? "Category renamed." : `"${result.category.name}" created.`);
        closeModal();
        onSaved?.();
      });
    },
  });
}

/* ----------------------------------------------------------- Confirmations */

export function confirmDeleteProduct(product, onDone) {
  // Deleting the last dish in a category also deletes that category.
  const category = store.categoryById(product.categoryId);
  const lastInCategory =
    !!category &&
    store.getProducts().filter((item) => item.categoryId === category.id).length === 1;

  confirmDialog({
    title: "Delete this dish?",
    message: lastInCategory
      ? `<strong>${esc(product.name)}</strong> will be removed from the menu and the storefront. It is the last dish in <strong>${esc(
          category.name
        )}</strong>, so that category will be deleted too. This cannot be undone.`
      : `<strong>${esc(product.name)}</strong> will be removed from the menu and the storefront. This cannot be undone.`,
    confirmLabel: lastInCategory ? "Delete dish and category" : "Delete dish",
    onConfirm() {
      const result = store.deleteProduct(product.id);
      const droppedCategory = result?.category;
      toast(
        droppedCategory
          ? `"${product.name}" and the "${droppedCategory.name}" category deleted.`
          : `"${product.name}" deleted.`
      );
      onDone?.();
    },
  });
}

export function confirmDeleteCategory(category, productCount, onDone) {
  confirmDialog({
    title: "Delete this category?",
    message:
      productCount > 0
        ? `<strong>${esc(category.name)}</strong> still holds ${productCount} dish${
            productCount === 1 ? "" : "es"
          }. Move them to another category before deleting it.`
        : `<strong>${esc(category.name)}</strong> will be removed from your menu structure. This cannot be undone.`,
    confirmLabel: "Delete category",
    onConfirm() {
      const result = store.deleteCategory(category.id);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      toast(`"${category.name}" deleted.`);
      onDone?.();
    },
  });
}
