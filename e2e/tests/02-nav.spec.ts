import { test, expect } from '@playwright/test';
import { gotoAndAssert, clearAppData } from '../utils/helpers';

test.beforeEach(async ({ page }) => {
  await clearAppData(page);
});

test('Hamburger opens and closes the drawer (mobile)', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.toLowerCase().includes('mobile'), 'Mobile-only behaviour');

  await gotoAndAssert(page, '/index.html');

  const btn = page.locator('[data-yt="navbtn"]').first();
  await expect(btn).toBeVisible();
  await btn.click();

  const drawer = page.locator('[data-yt="drawer"]');
  await expect(drawer).toHaveClass(/is-open/);

  // Click a link inside drawer should close it
  const firstLink = drawer.locator('a').first();
  await firstLink.click();

  // allow navigation then drawer should not be open
  await page.waitForTimeout(200);
  await expect(page.locator('[data-yt="drawer"]')).not.toHaveClass(/is-open/);
});
