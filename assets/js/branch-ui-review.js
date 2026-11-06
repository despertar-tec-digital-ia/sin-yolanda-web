// Local review candidate: one predictable header for the four Texas branches.
export function createHeaderState(startY = 0) {
  let previous = Math.max(0,startY), direction = 0, travel = 0;
  let hidden = false, scrolled = previous > 32;
  return ({y, maxY = Infinity, protectedFocus = false, reset = false}) => {
    const position = Math.min(Math.max(0,maxY),Math.max(0,y));
    scrolled = scrolled ? position > 16 : position > 32;
    if (reset || position <= 160 || protectedFocus) {
      hidden = false; direction = 0; travel = 0;
    } else {
      const delta = position - previous, next = Math.sign(delta);
      if (next) {
        if (next !== direction) travel = 0;
        direction = next; travel += Math.abs(delta);
        if (travel >= (direction < 0 ? 10 : 36)) { hidden = direction > 0; travel = 0; }
      }
    }
    previous = position;
    return {hidden,scrolled};
  };
}

export function initializeBranchHeader(doc = document) {
  const header = doc.querySelector('body[data-usa-ui-review] .hh-header');
  if (!header || header.hasAttribute('data-ui-ready')) return;
  const win = doc.defaultView, updateState = createHeaderState(win.scrollY);
  let frame = 0, keyboard = false, resetNext = false;
  function update() {
    frame = 0;
    const next = updateState({y:win.scrollY,maxY:doc.documentElement.scrollHeight-win.innerHeight,
      protectedFocus:keyboard || !!header.querySelector(':focus-visible'),reset:resetNext});
    resetNext = false;
    header.toggleAttribute('data-scrolled',next.scrolled);
    header.toggleAttribute('data-hidden',next.hidden);
  }
  function schedule() { if (!frame) frame = win.requestAnimationFrame(update); }
  function reveal() { resetNext = true; schedule(); }
  header.setAttribute('data-smart-header','');header.setAttribute('data-ui-ready','');
  header.addEventListener('focusin',reveal);
  doc.addEventListener('keydown',event => { if (event.key === 'Tab') { keyboard = true; reveal(); } });
  for (const type of ['wheel','touchstart','pointerdown']) doc.addEventListener(type,() => { keyboard = false; },{passive:true});
  win.addEventListener('scroll',schedule,{passive:true});
  win.addEventListener('resize',reveal,{passive:true});
  win.addEventListener('pageshow',reveal);
  update();
}
if (typeof document !== 'undefined') initializeBranchHeader();
