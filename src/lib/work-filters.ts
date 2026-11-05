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

const FIELDS = ['format', 'role'] as const;

// Mirror the selects into ?format=&role= without adding history entries.
function syncUrl(form: HTMLFormElement) {
  const url = new URL(location.href);
  for (const name of FIELDS) {
    const value = form.querySelector<HTMLSelectElement>(`[name="${name}"]`)?.value ?? '';
    if (value) url.searchParams.set(name, value);
    else url.searchParams.delete(name);
  }
  if (url.href !== location.href) history.replaceState(history.state, '', url);
}

// Restore selects from the URL; unknown values are ignored.
function readUrl(form: HTMLFormElement) {
  const params = new URLSearchParams(location.search);
  for (const name of FIELDS) {
    const select = form.querySelector<HTMLSelectElement>(`[name="${name}"]`);
    const wanted = params.get(name);
    if (!select || wanted === null) continue;
    select.value = [...select.options].some((option) => option.value === wanted) ? wanted : '';
  }
}

function setup() {
  const form = document.querySelector<HTMLFormElement>('[data-work-filters]');
  if (!form) return;
  form.hidden = false;
  readUrl(form);
  apply(form);
}

document.addEventListener('change', (event) => {
  if (!(event.target instanceof Element)) return;
  const form = event.target.closest<HTMLFormElement>('[data-work-filters]');
  if (form) { apply(form); syncUrl(form); }
});
document.addEventListener('reset', (event) => {
  if (event.target instanceof HTMLFormElement && event.target.matches('[data-work-filters]')) {
    // Native reset applies the default values after dispatching this event.
    const form = event.target;
    setTimeout(() => { if (form.isConnected) { apply(form); syncUrl(form); } }, 0);
  }
});
setup();
document.addEventListener('astro:page-load', setup);
// Restored from the back/forward cache without a page-load event.
window.addEventListener('pageshow', (event) => { if (event.persisted) setup(); });
