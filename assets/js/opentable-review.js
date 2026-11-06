// Restore keyboard focus after the provider completes its own close and cleanup.
export function watchBookingModal(doc = document, Observer = MutationObserver) {
  const section = doc.querySelector('[data-opentable-pilot]');
  if (!section) return null;
  let previousModal = null;
  let trigger = null;
  const update = () => {
    const modal = doc.querySelector('dialog[open] iframe[name="cfe-modal-iframe"]')?.closest('dialog') ?? null;
    if (modal) {
      if (!previousModal) trigger = section.querySelector('iframe[name="opentable-make-reservation-widget"]');
      previousModal = modal;
      return;
    }
    if (!previousModal) return;
    const closedModal = previousModal;
    previousModal = null;
    const active = doc.activeElement;
    if ((!active || active === doc.body || !active.isConnected || closedModal.contains?.(active)) && trigger?.isConnected) trigger.focus({preventScroll: true});
    trigger = null;
  };
  const observer = new Observer(update);
  observer.observe(doc.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['open']});
  update();
  return observer;
}
if (typeof document !== 'undefined') watchBookingModal();

