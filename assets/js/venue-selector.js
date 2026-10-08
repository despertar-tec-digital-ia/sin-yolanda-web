/* Reviewed gallery behavior. Native links navigate; preview state never cancels a click.
 * Pattern credit and conditions: /licenses/react-bits.txt.
 */
(function () {
  "use strict";
  const root = document.querySelector(".venue-showcase");
  if (!root) return;
  const gallery = root.querySelector("[data-venue-gallery]");
  const items = Array.from(root.querySelectorAll("[data-venue-item]"));
  const filters = Array.from(root.querySelectorAll("[data-venue-filter]"));
  const status = root.querySelector("[data-venue-status]");
  const hoverLayout = window.matchMedia("(min-width: 1100px) and (hover: hover) and (pointer: fine)");
  let lastPreview = items[0] || null;

  function preview(item) {
    if (!item || item.hidden) return;
    lastPreview = item;
    for (const candidate of items) {
      const open = candidate === item;
      candidate.classList.toggle("is-open", open);
      candidate.querySelector("[data-venue]").classList.toggle("is-open", open);
    }
  }

  function syncLayout() {
    const visible = items.filter((item) => !item.hidden);
    // Preserve the reviewed accordion for up to seven; larger collections become a grid.
    gallery.classList.toggle("venue-gallery--many", visible.length > 7);
    const grow = visible.length > 1 ? (.4 * (visible.length - 1)) / .6 : 1;
    gallery.style.setProperty("--expanded-grow", String(grow));
    if (!lastPreview || lastPreview.hidden) preview(visible[0]);
  }

  for (const item of items) {
    const card = item.querySelector("[data-venue]");
    item.addEventListener("pointerenter", (event) => {
      if (hoverLayout.matches && event.pointerType === "mouse") preview(item);
    });
    card.addEventListener("focus", () => {
      if (hoverLayout.matches) preview(item);
    });
    const image = card.querySelector("img");
    if (image) {
      const failed = () => card.classList.add("is-media-missing");
      image.addEventListener("error", failed);
      if (image.complete && image.naturalWidth === 0) failed();
    }
    // Deliberately no click handler: Enter, touch, modifiers and new tabs remain native.
  }

  for (const filter of filters) {
    filter.addEventListener("click", () => {
      const value = filter.dataset.venueFilter;
      for (const button of filters) {
        const selected = button === filter;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
      }
      for (const item of items) {
        item.hidden = value === "soon" ? item.dataset.status !== "coming-soon"
          : value !== "all" && item.dataset.region !== value;
      }
      syncLayout();
      const count = items.filter((item) => !item.hidden).length;
      const english = document.documentElement.lang === "en";
      status.textContent = english ? `${count} ${count === 1 ? "location" : "locations"}`
        : `${count} ${count === 1 ? "sucursal" : "sucursales"}`;
    });
  }
  hoverLayout.addEventListener("change", syncLayout);
  syncLayout();
})();
