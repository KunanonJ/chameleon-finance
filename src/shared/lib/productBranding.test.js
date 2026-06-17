import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { PRODUCT_BRAND, getDatedExportFilename } from './productBranding';

const USER_FACING_FILES = [
  'src/app/App.jsx',
  'index.html',
  'public/manifest.json',
  'capacitor.config.json',
  'AI_HANDOFF.md',
];

const REMOVED_PRODUCT_PRD = 'Product Requirements Document_ Base44 - AI-Powered No-Code App Builder.md';

describe('product branding', () => {
  test('uses Open Finance as the canonical public product identity', () => {
    expect(PRODUCT_BRAND.name).toBe('Open Finance');
    expect(PRODUCT_BRAND.shortName).toBe('Open Finance');
    expect(PRODUCT_BRAND.tagline).toMatch(/finance/i);
    expect(PRODUCT_BRAND.description).toMatch(/subscription/i);
    expect(getDatedExportFilename('2026-06-16')).toBe('open-finance-2026-06-16.csv');
  });

  test('does not expose Base44 or no-code AI-builder positioning', () => {
    const forbidden = [
      /Base44/i,
      /AI-Powered/i,
      /No-Code/i,
      /AI-builder/i,
      /Builder Chat/i,
      /Discussion Mode/i,
      /natural-language workflow/i,
      /prompt parsing/i,
      /generated app blueprint/i,
    ];

    for (const file of USER_FACING_FILES) {
      const content = readFileSync(resolve(process.cwd(), file), 'utf8');
      for (const pattern of forbidden) {
        expect(content, `${file} should not contain ${pattern}`).not.toMatch(pattern);
      }
    }

    expect(existsSync(resolve(process.cwd(), REMOVED_PRODUCT_PRD))).toBe(false);
  });

  test('core public metadata uses Open Finance instead of Chameleon', () => {
    const publicFiles = [
      'src/app/App.jsx',
      'index.html',
      'public/manifest.json',
      'capacitor.config.json',
    ];

    for (const file of publicFiles) {
      const content = readFileSync(resolve(process.cwd(), file), 'utf8');
      if (file === 'src/app/App.jsx') {
        expect(content, `${file} should use canonical brand constants`).toMatch(/PRODUCT_BRAND/);
      } else {
        expect(content, `${file} should reference Open Finance`).toMatch(/Open Finance/);
      }
      expect(content, `${file} should not expose old Chameleon brand`).not.toMatch(/\bChameleon\b/);
    }
  });
});
