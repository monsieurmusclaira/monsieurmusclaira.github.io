export {};

function apply(form: HTMLFormElement) {
  const format = form.querySelector<HTMLSelectElement>('[name="format"]')?.value ?? '';
  const role = form.querySelector<HTMLSelectElement>('[name="role"]')?.value ?? '';
  const items = [...document.querySelectorAll<HTMLElement>('[data-work-item]')];
  let count = 0;
  for (const item of items) {
    item.hidden = Boolean((format && item.dataset.format !== format) || (role && item.dataset.role !== role));
    if (!item.hidden) count++;
  }
  const output = document.querySelector<HTMLElement>('[data-work-count]');
  const empty = document.querySelector<HTMLElement>('[data-work-empty]');
  if (output) output.textContent = `${count} of ${items.length} projects`;
  if (empty) empty.hidden = count > 0;
}

function setup() {
  const form = document.querySelector<HTMLFormElement>('[data-work-filters]');
  if (!form) return;
  form.hidden = false;
  apply(form);
}

document.addEventListener('change', (event) => {
  if (!(event.target instanceof Element)) return;
  const form = event.target.closest<HTMLFormElement>('[data-work-filters]');
  if (form) apply(form);
});
document.addEventListener('reset', (event) => {
  if (event.target instanceof HTMLFormElement && event.target.matches('[data-work-filters]')) {
    // Native reset applies the default values after dispatching this event.
    const form = event.target;
    setTimeout(() => { if (form.isConnected) apply(form); }, 0);
  }
});
setup();
document.addEventListener('astro:page-load', setup);
