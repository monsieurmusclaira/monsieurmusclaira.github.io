type DataConnection = EventTarget & { saveData?: boolean };

/** Play the decorative hero only when visible and allowed by device policy. */
export function attachHeroVideo(video: HTMLVideoElement) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = window.matchMedia('(max-width: 767px)');
  const connection = (navigator as Navigator & { connection?: DataConnection }).connection;
  const bounds = video.getBoundingClientRect();
  let inView = bounds.bottom > 0 && bounds.top < window.innerHeight;
  let disposed = false;
  let playPending = false;

  const eligible = () => !motion.matches && !narrow.matches && !connection?.saveData;
  const shouldPlay = () => !disposed && eligible() && inView && !document.hidden;

  function sync() {
    if (disposed) return;
    if (!shouldPlay()) {
      video.pause();
      return;
    }
    if (!video.dataset.loaded) {
      for (const source of video.querySelectorAll<HTMLSourceElement>('source[data-src]')) {
        source.src = source.dataset.src!;
      }
      video.dataset.loaded = '1';
      video.load();
    }
    if (!video.paused || playPending) return;
    playPending = true;
    video.play().then(() => {
      playPending = false;
      // A preference change or page swap can occur while play() is pending.
      if (!shouldPlay()) video.pause();
    }).catch(() => {
      playPending = false;
      // Keep the poster if the browser blocks autoplay.
    });
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.target !== video) continue;
      inView = entry.isIntersecting;
      sync();
    }
  });
  observer.observe(video);
  motion.addEventListener('change', sync);
  narrow.addEventListener('change', sync);
  connection?.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();

  return () => {
    disposed = true;
    observer.disconnect();
    motion.removeEventListener('change', sync);
    narrow.removeEventListener('change', sync);
    connection?.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
    video.pause();
  };
}
