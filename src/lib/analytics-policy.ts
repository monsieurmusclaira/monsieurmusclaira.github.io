export const CONSENT_KEY = 'portfolio-analytics-choice-v1';
export type AnalyticsChoice = 'accepted' | 'declined';

export function analyticsAllowed(production: boolean, hostname: string, siteUrl: string, disabled = false) {
  return production && !disabled && hostname === new URL(siteUrl).hostname;
}

/** Fragment changes, including contact and gallery history, are not page views. */
export function pageViewKey(url: string) {
  const page = new URL(url);
  return page.origin + page.pathname + page.search;
}
