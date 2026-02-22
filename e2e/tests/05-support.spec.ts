import { test, expect } from '@playwright/test';
import { gotoAndAssert, clearAppData } from '../utils/helpers';

test.beforeEach(async ({ page }) => {
  await clearAppData(page);
});

test('Support page payment links are present and clickable', async ({ page }) => {
  await gotoAndAssert(page, '/support.html');

  // Coffee link (with emoji)
  const coffee = page.locator('a:has-text("☕")').first();
  await expect(coffee).toBeVisible();
  await expect(coffee).toHaveAttribute('href', /buymeacoffee|support|coffee|http/i);

  // Card/Apple Pay link should go to SumUp (popup/new tab)
  const card = page.locator('a.support-pay-btn, a:has-text("Card"), a:has-text("Apple Pay")').first();
  await expect(card).toBeVisible();
  const href = await card.getAttribute('href');
  expect(href || '').not.toBe('#');
});
