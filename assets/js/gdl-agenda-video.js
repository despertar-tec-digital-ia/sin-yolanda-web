// One silent agenda video. No third-party player, tracking, or eager page-wide download.
(() => {
  const frame = document.querySelector('[data-agenda-video]');
  if (!frame) return;
  const video = frame.querySelector('video');
  const toggle = frame.querySelector('[data-video-toggle]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let manuallyPaused = false;
  let explicitlyStarted = false;
  const label = () => { toggle.textContent = video.paused ? 'Reproducir video' : 'Pausar video'; };
  const start = () => {
    video.muted = true;
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    const playing = video.play();
    if (playing?.catch) playing.catch(label);
  };
  const sync = () => {
    const permitted = explicitlyStarted || (!reduced.matches && !navigator.connection?.saveData);
    if (visible && !document.hidden && !manuallyPaused && permitted) start();
    else video.pause();
    label();
  };
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    if (video.paused) { manuallyPaused = false; explicitlyStarted = true; start(); }
    else { manuallyPaused = true; video.pause(); }
    label();
  });
  video.addEventListener('play', label);
  video.addEventListener('pause', label);
  video.addEventListener('error', () => { toggle.hidden = true; });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => { explicitlyStarted = false; sync(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: 0.15 }).observe(frame);
  } else {
    // A usable poster/link and manual playback remain when intersection detection is absent.
    label();
  }
})();
