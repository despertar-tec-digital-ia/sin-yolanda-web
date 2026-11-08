/* Local candidate for the reviewed AccordionGallery adaptation.
 * Pattern credit and conditions: /licenses/react-bits.txt.
 */
export function galleryPlan(width, count, gap = 10) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isInteger(count) || count < 1) return null;
  if (count === 1) return {open: width, rail: width, span: width, overflow: false};
  const minRail = 72, minOpen = 340;
  const usable = Math.max(width - gap * (count - 1), 0);
  const ratio = count === 2 ? .6 : count === 3 ? .5 : .4;
  const requested = count < 4 ? usable * ratio : Math.min(540, Math.max(minOpen, usable * ratio));
  const canFit = usable >= minOpen + minRail * (count - 1);
  const open = canFit ? Math.min(requested, usable - minRail * (count - 1)) : minOpen;
  const rail = canFit ? (usable - open) / (count - 1) : minRail;
  const span = open + rail * (count - 1) + gap * (count - 1);
  return {open, rail, span, overflow: span > width + 1};
}

export function initCapacityGallery(root, win = window) {
  if (!root) return;
  const gallery = root.querySelector('[data-venue-gallery]');
  const items = Array.from(root.querySelectorAll('[data-venue-item]'));
  const filters = Array.from(root.querySelectorAll('[data-venue-filter]'));
  const status = root.querySelector('[data-venue-status]');
  const hover = win.matchMedia('(min-width: 1100px) and (hover: hover) and (pointer: fine)');
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  let selected = items.find(item => item.classList.contains('is-open')) || items[0];

  function preview(item, keyboard = false) {
    if (!item || item.hidden) return;
    selected = item;
    for (const candidate of items) {
      const open = candidate === item;
      candidate.classList.toggle('is-open', open);
      candidate.querySelector('[data-venue]').classList.toggle('is-open', open);
    }
    // Focus is never moved by hover. Keep keyboard targets visible if a future rail overflows.
    if (keyboard && gallery.classList.contains('venue-gallery--rail')) {
      const index = items.filter(candidate => !candidate.hidden).indexOf(item);
      const plan = galleryPlan(gallery.getBoundingClientRect().width, items.filter(candidate => !candidate.hidden).length);
      if (!plan) return;
      const left = index * (plan.rail + 10), right = left + plan.open;
      const target = left < gallery.scrollLeft ? left : right > gallery.scrollLeft + gallery.clientWidth ? right - gallery.clientWidth : gallery.scrollLeft;
      gallery.scrollTo({left: target, behavior: reduced.matches ? 'instant' : 'smooth'});
    }
  }

  function syncLayout() {
    const visible = items.filter(item => !item.hidden);
    // Reflow immediately when available space or the filtered set changes. Animate
    // user selection, not stale widths from a different viewport/cardinality.
    gallery.classList.add('venue-gallery--sizing');
    const plan = galleryPlan(gallery.getBoundingClientRect().width, visible.length);
    const accordion = hover.matches && !!plan;
    gallery.classList.remove('venue-gallery--many');
    gallery.classList.toggle('venue-gallery--capacity', accordion);
    gallery.classList.toggle('venue-gallery--rail', accordion && plan.overflow);
    if (plan) {
      gallery.style.setProperty('--venue-open-width', plan.open + 'px');
      gallery.style.setProperty('--venue-rail-width', plan.rail + 'px');
    }
    if (!accordion || !plan.overflow) gallery.scrollLeft = 0;
    if (!selected || selected.hidden) preview(visible[0]);
    else preview(selected);
    gallery.getBoundingClientRect();
    gallery.classList.remove('venue-gallery--sizing');
  }

  for (const item of items) {
    const card = item.querySelector('[data-venue]');
    item.addEventListener('pointerenter', event => {
      if (hover.matches && event.pointerType === 'mouse') preview(item);
    });
    card.addEventListener('focus', () => { if (hover.matches) preview(item, true); });
    const image = card.querySelector('img');
    if (image) {
      const failed = () => card.classList.add('is-media-missing');
      image.addEventListener('error', failed);
      if (image.complete && image.naturalWidth === 0) failed();
    }
    // No click handlers: touch, modifier-click and Enter retain native navigation.
  }
  for (const filter of filters) filter.addEventListener('click', () => {
    const value = filter.dataset.venueFilter;
    for (const button of filters) {
      const active = button === filter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    for (const item of items) item.hidden = value === 'soon' ? item.dataset.status !== 'coming-soon'
      : value !== 'all' && item.dataset.region !== value;
    syncLayout();
    const count = items.filter(item => !item.hidden).length;
    const english = win.document.documentElement.lang === 'en';
    status.textContent = english ? `${count} ${count === 1 ? 'location' : 'locations'}` : `${count} ${count === 1 ? 'sucursal' : 'sucursales'}`;
  });
  hover.addEventListener('change', syncLayout);
  if (win.ResizeObserver) new win.ResizeObserver(syncLayout).observe(gallery);
  syncLayout();
}
if (typeof document !== 'undefined') initCapacityGallery(document.querySelector('.venue-showcase'));
