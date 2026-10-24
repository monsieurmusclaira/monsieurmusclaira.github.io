// The element owns one header's listeners, including across Astro DOM swaps.
class SiteNavigation extends HTMLElement {
  private controller?: AbortController;
  private scrollFrame?: number;

  connectedCallback() {
    if (this.controller) return;
    const header = this.closest('header');
    const button = this.querySelector<HTMLButtonElement>('#menu-toggle');
    const menu = this.querySelector<HTMLElement>('#mobile-menu');
    const dropdown = this.querySelector<HTMLElement>('#menu-dropdown');
    if (!header || !button || !menu || !dropdown) return;
    this.controller = new AbortController();
    const { signal } = this.controller;
    const desktop = matchMedia('(min-width: 1024px)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let lastY = scrollY;
    let lastHeaderFocus: Element | null = null;

    const showHeader = () => { header.style.transform = 'translateY(0)'; };
    const setMenu = (open: boolean) => {
      menu.classList.toggle('hidden', !open);
      dropdown.classList.toggle('dropdown-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (open) showHeader();
    };
    const closeMenu = (restoreFocus = false) => {
      setMenu(false);
      if (restoreFocus) button.focus();
    };
    const onScroll = () => {
      if (reducedMotion.matches || this.scrollFrame !== undefined) return;
      this.scrollFrame = requestAnimationFrame(() => {
        this.scrollFrame = undefined;
        const y = scrollY;
        const menuOpen = button.getAttribute('aria-expanded') === 'true';
        header.style.transform = !menuOpen && !header.contains(document.activeElement) && y > lastY && y > 80
          ? 'translateY(-100%)' : 'translateY(0)';
        lastY = y;
      });
    };
    const onBreakpointChange = () => {
      // A newly hidden link can blur before the media change event arrives.
      const focus = document.activeElement === document.body ? lastHeaderFocus : document.activeElement;
      const focusWasMobile = focus !== null && dropdown.contains(focus);
      const desktopLinks = this.querySelector('#desktop-links');
      const focusWasDesktop = focus !== null && desktopLinks?.contains(focus);
      closeMenu();
      if (desktop.matches && focusWasMobile) {
        (this.querySelector<HTMLElement>('#desktop-links a[aria-current="page"]')
          ?? this.querySelector<HTMLElement>('.navbar-center a'))?.focus();
      } else if (!desktop.matches && focusWasDesktop) button.focus();
      showHeader();
    };

    dropdown.classList.add('js-menu');
    closeMenu();
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      setMenu(button.getAttribute('aria-expanded') !== 'true');
    }, { signal });
    menu.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('a')) closeMenu();
    }, { signal });
    document.addEventListener('click', (event) => {
      if (event.target instanceof Node && !menu.contains(event.target) && !button.contains(event.target)) closeMenu();
    }, { signal });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
        event.preventDefault();
        closeMenu(true);
      }
    }, { signal });
    document.addEventListener('focusin', (event) => {
      lastHeaderFocus = event.target instanceof Element && header.contains(event.target) ? event.target : null;
      if (lastHeaderFocus) showHeader();
    }, { signal });
    window.addEventListener('scroll', onScroll, { passive: true, signal });
    desktop.addEventListener('change', onBreakpointChange, { signal });
    reducedMotion.addEventListener('change', () => {
      if (this.scrollFrame !== undefined) cancelAnimationFrame(this.scrollFrame);
      this.scrollFrame = undefined;
      lastY = scrollY;
      showHeader();
    }, { signal });
  }

  disconnectedCallback() {
    this.controller?.abort();
    this.controller = undefined;
    if (this.scrollFrame !== undefined) cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = undefined;
  }
}

if (!customElements.get('site-navigation')) customElements.define('site-navigation', SiteNavigation);
