import { test, expect } from '@playwright/test';
import { clearAppData, gotoAndAssert } from '../utils/helpers';

test.beforeEach(async ({ page }) => {
  await clearAppData(page);
});

test('Printable plan is not blank after creating a profile', async ({ page }) => {
  await gotoAndAssert(page, '/profiles.html');

  const addBtn = page.getByRole('button', { name: /add/i }).first();
  if (await addBtn.isVisible().catch(()=>false)) await addBtn.click();

  const nameInput = page.locator('input[name="name"], input#kidName, input[placeholder*="name" i]').first();
  await expect(nameInput).toBeVisible();
  await nameInput.fill('Printable Kid');

  const saveBtn = page.getByRole('button', { name: /create|save|add profile/i }).first();
  await saveBtn.click();

  await page.goto('/printable-plan.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main')).toBeVisible();

  // Not blank: must have more than a trivial amount of text
  const text = await page.locator('main').innerText();
  expect((text || '').replace(/\s+/g,' ').trim().length).toBeGreaterThan(40);
});
