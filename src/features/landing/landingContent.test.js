import { describe, expect, test } from 'vitest';
import { landingContent } from './landingContent';

describe('Open Finance landing content', () => {
  test('is branded around finance tracking rather than design tooling', () => {
    const serialized = JSON.stringify(landingContent);

    expect(landingContent.productName).toBe('Open Finance');
    expect(serialized).toMatch(/subscription/i);
    expect(serialized).toMatch(/budget/i);
    expect(serialized).toMatch(/local-first/i);
    expect(serialized).not.toMatch(/Open Design/i);
    expect(serialized).not.toMatch(/Claude Design/i);
    expect(serialized).not.toMatch(/coding agents/i);
    expect(serialized).not.toMatch(/BYOK/i);
    expect(serialized).not.toMatch(/nexu-io\/open-design/i);
  });

  test('keeps the primary action inside the product app', () => {
    expect(landingContent.primaryCta.href).toBe('/app');
    expect(landingContent.primaryCta.label).toMatch(/open app/i);
  });
});
