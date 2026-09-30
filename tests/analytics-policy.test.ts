import { describe, expect, it } from 'vitest';
import { analyticsAllowed, pageViewKey } from '../src/lib/analytics-policy';

describe('analytics environment and navigation policy', () => {
  it.each(['localhost', '127.0.0.1', '::1', 'preview.example.com'])('never measures production preview host %s', (hostname) => {
    expect(analyticsAllowed(true, hostname, 'https://victormaes.com')).toBe(false);
  });
  it('only allows a production build on the configured host', () => {
    expect(analyticsAllowed(true, 'victormaes.com', 'https://victormaes.com')).toBe(true);
    expect(analyticsAllowed(false, 'victormaes.com', 'https://victormaes.com')).toBe(false);
    expect(analyticsAllowed(true, 'victormaes.com', 'https://victormaes.com', true)).toBe(false);
  });
  it('ignores fragment-only changes while preserving different paths and queries', () => {
    expect(pageViewKey('https://victormaes.com/about/#contact')).toBe(pageViewKey('https://victormaes.com/about/'));
    expect(pageViewKey('https://victormaes.com/about/')).not.toBe(pageViewKey('https://victormaes.com/projects/burn/'));
    expect(pageViewKey('https://victormaes.com/?filter=fiction')).not.toBe(pageViewKey('https://victormaes.com/'));
  });
});
