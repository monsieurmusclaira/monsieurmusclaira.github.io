let dialog: HTMLDialogElement | null;
let items: HTMLAnchorElement[] = [];
let index = 0;
const origins = new Map<HTMLDialogElement, HTMLAnchorElement>();

function setup() {
  dialog = document.querySelector<HTMLDialogElement>('#gallery-lightbox');
  items = [...document.querySelectorAll<HTMLAnchorElement>('a[data-lightbox-id]')];
  for (const item of items) {
    item.setAttribute('role', 'button');
    item.setAttribute('aria-haspopup', 'dialog');
    item.setAttribute('aria-controls', 'gallery-lightbox');
  }
}

function showImage(next: number) {
  if (!dialog || !items.length) return;
  index = (next + items.length) % items.length;
  const item = items[index];
  const image = dialog.querySelector<HTMLImageElement>('[data-gallery-image]');
  const caption = dialog.querySelector<HTMLElement>('[data-gallery-caption]');
  const position = dialog.querySelector<HTMLElement>('[data-gallery-position]');
  if (!image || !caption || !position) return;
  image.alt = item.dataset.lightboxAlt ?? '';
  image.width = Number(item.dataset.lightboxWidth);
  image.height = Number(item.dataset.lightboxHeight);
  image.src = item.href;
  caption.textContent = item.dataset.lightboxCaption ?? '';
  caption.hidden = !caption.textContent;
  position.textContent = `${index + 1} of ${items.length}`;
  dialog.setAttribute('aria-label', `Image: ${image.alt}`);
  for (const button of dialog.querySelectorAll<HTMLButtonElement>('[data-gallery-previous], [data-gallery-next]')) button.disabled = items.length < 2;
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const trigger = event.target.closest<HTMLAnchorElement>('a[data-lightbox-id]');
  if (trigger && dialog) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    origins.set(dialog, trigger);
    showImage(items.indexOf(trigger));
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>(".lightbox-close")?.focus();
    return;
  }
  if (!dialog?.open) return;
  if (event.target.closest('[data-gallery-previous]')) showImage(index - 1);
  else if (event.target.closest('[data-gallery-next]')) showImage(index + 1);
  else if (event.target.closest('.lightbox-close')) dialog.close();
  else if (event.target === dialog) {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }
});

// Native modal behavior can still let Tab move to browser chrome. Explicitly
// wrap at the first/last control, including Firefox's reverse-Tab behavior.
document.addEventListener("keydown", (event) => {
  if (!(event.target instanceof Element)) return;
  if (!dialog?.open) {
    const trigger = event.target.closest<HTMLAnchorElement>('a[data-lightbox-id]');
    if (event.key === ' ' && trigger) { event.preventDefault(); trigger.click(); }
    return;
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showImage(index + (event.key === 'ArrowRight' ? 1 : -1));
    return;
  }
  if (event.key !== "Tab") return;
  const controls = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((control) => control.tabIndex >= 0 && control.getClientRects().length > 0);
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) return;
  const active = document.activeElement;
  if (!dialog.contains(active) || (event.shiftKey ? active === first : active === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
});

document.addEventListener("close", (event) => {
  if (!(event.target instanceof HTMLDialogElement)) return;
  const trigger = origins.get(event.target);
  origins.delete(event.target);
  event.target.querySelector<HTMLImageElement>('[data-gallery-image]')?.removeAttribute('src');
  if (trigger?.isConnected) trigger.focus({ preventScroll: true });
}, true);

document.addEventListener("astro:before-swap", () => {
  for (const dialog of document.querySelectorAll<HTMLDialogElement>("dialog.lightbox[open]")) dialog.close();
});

setup();
document.addEventListener('astro:page-load', setup);
