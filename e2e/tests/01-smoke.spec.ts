import { test, expect } from '@playwright/test';
import { gotoAndAssert, clearAppData } from '../utils/helpers';

const pages = [
  '/index.html',
  '/profiles.html',
  '/phase1.html',
  '/phase2.html',
  '/phase3.html',
  '/printable-plan.html',
  '/certificates.html',
  '/support.html',
  '/data-policy.html',
  '/debug.html'
];

test.beforeEach(async ({ page }) => {
  await clearAppData(page);
});

test('All key pages load with header + footer', async ({ page }) => {
  for (const p of pages) {
    await gotoAndAssert(page, p);
    // basic sanity: main exists
    await expect(page.locator('main')).toBeVisible();
  }
});
