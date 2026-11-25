// Local candidate: keep existing controls and their language-dependent state in sync.
export function installQualityControls(doc = document, win = window) {
  const galleries = [...doc.querySelectorAll('.venue-showcase')];
  const update = () => {
    const english = doc.documentElement.lang === 'en';
    for (const gallery of galleries) {
      const status = gallery.querySelector('[data-venue-status]');
      if (!status) continue;
      const count = [...gallery.querySelectorAll('[data-venue-item]')].filter(item => !item.hidden).length;
      const es = `${count} ${count === 1 ? 'sucursal' : 'sucursales'}`;
      const en = `${count} ${count === 1 ? 'location' : 'locations'}`;
      // The existing translator owns these attributes, including later filter changes.
      for (const [key, value] of [['data-i18n-es', es], ['data-i18n-en', en]]) {
        if (status.getAttribute(key) !== value) status.setAttribute(key, value);
      }
      const value = english ? en : es;
      if (status.textContent !== value) status.textContent = value;
    }
    const title = doc.querySelector('[data-quality-error-title]');
    if (title) {
      const value = title.getAttribute(english ? 'data-i18n-en' : 'data-i18n-es');
      if (doc.title !== value) doc.title = value;
    }
  };
  const observer = new win.MutationObserver(update);
  observer.observe(doc.documentElement, {attributes: true, attributeFilter: ['lang']});
  for (const gallery of galleries) {
    observer.observe(gallery, {subtree: true, attributes: true, attributeFilter: ['hidden']});
    gallery.addEventListener('click', update);
  }
  update();
  return {update, disconnect() {
    observer.disconnect();
    for (const gallery of galleries) gallery.removeEventListener('click', update);
  }};
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') installQualityControls();
