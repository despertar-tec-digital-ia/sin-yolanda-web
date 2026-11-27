// Ciudad Juárez opening invitation video. Native player controls; muted autoplay only while visible.
(() => {
  const frame = document.querySelector('[data-cj-video]');
  if (!frame) return;
  const video = frame.querySelector('video');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let userPaused = false;
  let selfPausing = false;
  const pause = () => {
    if (video.paused) return;
    selfPausing = true;
    video.pause();
  };
  const sync = () => {
    const permitted = !reduced.matches && !navigator.connection?.saveData;
    if (visible && !document.hidden && !userPaused && permitted) {
      const playing = video.play();
      if (playing?.catch) playing.catch(() => {});
    } else {
      pause();
    }
  };
  // A pause from the native controls is respected; pauses caused by scrolling away are not.
  video.addEventListener('pause', () => {
    if (selfPausing) selfPausing = false;
    else if (!video.ended) userPaused = true;
  });
  video.addEventListener('play', () => { userPaused = false; });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      // Leaving the viewport mutes again so audio never plays from an unseen element.
      if (!visible && !video.muted) video.muted = true;
      sync();
    }, { threshold: 0.35 }).observe(frame);
  }
})();
