// A native image remains available without JS. Zoom changes only its rendered size.
(() => {
  const viewport = document.querySelector('[data-menu-viewport]');
  const image = document.querySelector('[data-menu-image]');
  if (!viewport || !image) return;
  const controls = document.querySelector('[data-menu-controls]');
  const fallback = document.querySelector('[data-menu-fallback]');
  const status = document.querySelector('[data-menu-zoom-status]');
  let scale = null, fitted = false;
  const naturalWidth = () => image.naturalWidth || Number(image.getAttribute('width'));
  const fit = () => Math.min(1, viewport.clientWidth / naturalWidth());
  const readingSize = () => viewport.clientWidth <= 760 ? Math.min(1, 1800 / naturalWidth()) : fit();
  function render() {
    const zoom = fitted ? fit() : (scale ?? readingSize());
    image.style.width = (naturalWidth() * zoom) + 'px';
    image.style.maxWidth = 'none';
    status.textContent = Math.round(zoom * 100) + '%';
    controls.querySelector('[data-menu-zoom="out"]').disabled = zoom <= fit() + 0.001;
    controls.querySelector('[data-menu-zoom="in"]').disabled = zoom >= 1;
  }
  function ready() {
    controls.hidden = false; render();
    // Skip the paper's outer margin, never any content, in the mobile reading view.
    if (viewport.clientWidth <= 760 && !fitted) viewport.scrollLeft = 60;
  }
  function failed() { controls.hidden = true; fallback.hidden = false; image.hidden = true; }
  controls.addEventListener('click', event => {
    const action = event.target.closest('[data-menu-zoom]')?.dataset.menuZoom;
    if (!action) return;
    const previous = fitted ? fit() : (scale ?? readingSize());
    if (action === 'fit') { fitted = true; scale = null; viewport.scrollLeft = 0; }
    else {
      fitted = false;
      const next = Math.max(fit(), Math.min(1, previous + (action === 'in' ? 0.2 : -0.2)));
      scale = next;
    }
    render();
  });
  image.addEventListener('load', ready);
  image.addEventListener('error', failed);
  if (image.complete) image.naturalWidth ? ready() : failed();
  window.addEventListener('resize', render, { passive: true });
})();
