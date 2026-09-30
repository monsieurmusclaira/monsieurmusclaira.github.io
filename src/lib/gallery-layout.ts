// Match ProjectPage's 1152px container, 16px side padding and 12px column gap.
export const gallerySizes = {
  grid: '(min-width: 1152px) 554px, (min-width: 768px) calc((100vw - 44px) / 2), calc(100vw - 32px)',
  wide: '(min-width: 928px) 896px, calc(100vw - 32px)',
  full: '(min-width: 1152px) 1152px, (min-width: 768px) 100vw, calc(100vw - 32px)',
};

// Match the board's clamped padding, capped columns, 30px gaps and 13px frame.
export const polaroidSizes = '(max-width: 560px) calc(min(380px, 100vw - max(32px, 10vw)) - 26px), (max-width: 1024px) calc((min(760px, 90vw) - 30px) / 2 - 26px), calc((min(1180px, 90vw) - 60px) / 3 - 26px)';
