// One-shot presentation only; controls are always visible, enabled and owned by their source.
export function initializeBranchMotion(doc = document) {
  if (!doc.body.hasAttribute('data-sy-motion-review')) return null;
  const win = doc.defaultView;
  if (win.matchMedia('(prefers-reduced-motion: reduce)').matches || !win.IntersectionObserver) return null;
  const observer = new win.IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.setAttribute('data-motion-revealed', '');
      observer.unobserve(entry.target);
    }
  }, {threshold: .15, rootMargin: '0px 0px -24px 0px'});
  for (const element of doc.querySelectorAll('.sy-booking-copy,.hh-table h2,.sy-agenda h2,.sy-agenda h3,.sy-social-feed h2,.bct-copy,.visit-editorial h2')) observer.observe(element);
  win.addEventListener('pagehide', event => { if (!event.persisted) observer.disconnect(); });
  return observer;
}
if (typeof document !== 'undefined') initializeBranchMotion();
