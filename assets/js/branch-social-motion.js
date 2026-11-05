// Native, silent media. No Instagram player, cookies or third-party requests.
export function createMotionController({kind, count = 1, play, pause, loadSlide, showSlide,
  onState = () => {}, schedule = setTimeout, cancel = clearTimeout, interval = 5000}) {
  const state = {visible:false, hidden:false, reduced:false, saveData:false,
    paused:false, optedIn:false, blocked:false, hovering:false, focused:false, index:0};
  let wanted = false, generation = 0, timer;
  const permitted = () => !state.paused && !state.blocked &&
    (!(state.reduced || state.saveData) || state.optedIn);
  const report = () => onState({...state, enabled:permitted()});
  const stopTimer = () => { if (timer !== undefined) cancel(timer); timer = undefined; };
  async function advance(target, token) {
    try {
      await loadSlide(target);
      if (token !== generation) return;
      state.index = target; showSlide(target); report();
    } catch { /* Keep the last complete image if a download or decode fails. */ }
  }
  function queue() {
    stopTimer();
    if (!wanted) return;
    const token = generation;
    timer = schedule(async () => {
      timer = undefined;
      await advance((state.index + 1) % count, token);
      if (wanted && token === generation) queue();
    }, interval);
  }
  function reconcile() {
    const next = permitted() && state.visible && !state.hidden &&
      !(kind === 'carousel' && (state.hovering || state.focused));
    report();
    if (next === wanted) return;
    wanted = next; const token = ++generation; stopTimer();
    if (!wanted) { if (kind === 'reel') pause(); return; }
    if (kind === 'carousel') { queue(); return; }
    Promise.resolve().then(() => { if (wanted && token === generation) return play(); }).then(() => {
      if (!wanted) pause();
    }).catch(() => {
      if (token !== generation) return;
      state.blocked = true; wanted = false; pause(); report();
    });
  }
  return {
    update(values) { Object.assign(state,values); reconcile(); },
    toggle() {
      if (permitted()) state.paused = true;
      else { state.paused = false; state.blocked = false; state.optedIn = true; }
      reconcile();
    },
    async step(direction) {
      state.paused = true; reconcile();
      const token = ++generation;
      await advance((state.index + direction + count) % count, token);
    },
    snapshot: () => ({...state, enabled:permitted(), running:wanted}),
    destroy() { wanted = false; ++generation; stopTimer(); if (kind === 'reel') pause(); }
  };
}

export function initializeSocialMotion(root = document) {
  const feed = root.querySelector('#instagram-houston[data-social-motion]');
  if (!feed) return;
  const doc = feed.ownerDocument, win = doc.defaultView;
  const preference = win.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = win.navigator.connection;
  const en = doc.documentElement.lang.startsWith('en');
  const controllers = new Map();
  const policy = () => ({hidden:doc.hidden, reduced:preference.matches, saveData:!!connection?.saveData});
  for (const card of feed.querySelectorAll('[data-motion-kind]')) {
    const kind = card.dataset.motionKind, toggle = card.querySelector('[data-motion-toggle]');
    const video = card.querySelector('video'), images = [...card.querySelectorAll('.sy-social-photo img')];
    const counter = card.querySelector('[data-motion-count]');
    const controller = createMotionController({kind, count:images.length,
      play:async () => {
        if (!video.getAttribute('src')) { video.muted = true; video.defaultMuted = true; video.src = video.dataset.src; }
        if (video.error) video.load();
        await video.play();
      }, pause:() => video?.pause(),
      loadSlide:async index => {
        const img = images[index];
        if (img.dataset.src) { img.srcset = img.dataset.srcset; img.src = img.dataset.src; }
        await img.decode();
      },
      showSlide:index => images.forEach((img,i) => { img.hidden = i !== index; }),
      onState:state => {
        const action = state.enabled ? (en ? 'Pause' : 'Pausar') : (en ? 'Play' : 'Reproducir');
        toggle.setAttribute('aria-label',action + (kind === 'reel' ? (en ? ' silent video' : ' video sin sonido') : (en ? ' slideshow' : ' fotos')));
        toggle.dataset.enabled = String(state.enabled);
        if (counter) counter.textContent = `${state.index + 1} / ${images.length}`;
      }
    });
    if (video) {
      video.addEventListener('playing',() => card.classList.add('sy-motion-playing'));
      video.addEventListener('error',() => { card.classList.remove('sy-motion-playing'); controller.update({blocked:true}); });
    }
    toggle.addEventListener('click',() => controller.toggle());
    card.querySelector('[data-motion-prev]')?.addEventListener('click',() => controller.step(-1));
    card.querySelector('[data-motion-next]')?.addEventListener('click',() => controller.step(1));
    if (kind === 'carousel') {
      card.addEventListener('mouseenter',() => controller.update({hovering:true}));
      card.addEventListener('mouseleave',() => controller.update({hovering:false}));
      card.addEventListener('focusin',() => controller.update({focused:true}));
      card.addEventListener('focusout',event => { if (!card.contains(event.relatedTarget)) controller.update({focused:false}); });
    }
    controller.update(policy());
    card.querySelectorAll('.sy-motion-control').forEach(button => { button.hidden = false; });
    controllers.set(card,controller);
  }
  const updatePolicy = () => { for (const controller of controllers.values()) controller.update(policy()); };
  doc.addEventListener('visibilitychange',updatePolicy);
  preference.addEventListener('change',() => {
    for (const controller of controllers.values()) controller.update({...policy(), optedIn:false});
  });
  connection?.addEventListener('change',updatePolicy);
  if ('IntersectionObserver' in win) {
    const observer = new win.IntersectionObserver(entries => {
      for (const entry of entries) controllers.get(entry.target)?.update({visible:entry.isIntersecting && entry.intersectionRatio >= .35});
    },{threshold:[0,.35]});
    for (const card of controllers.keys()) observer.observe(card);
  } else {
    for (const controller of controllers.values()) controller.update({visible:true});
  }
  win.addEventListener('pagehide',() => { for (const controller of controllers.values()) controller.update({hidden:true}); });
  win.addEventListener('pageshow',updatePolicy);
}

if (typeof document !== 'undefined') initializeSocialMotion();
