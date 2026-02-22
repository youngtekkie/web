import { test, expect } from '@playwright/test';
import { gotoAndAssert, clearAppData } from '../utils/helpers';

test.beforeEach(async ({ page }) => {
  await clearAppData(page);
});

test('Create a child profile and it persists after navigating away', async ({ page }) => {
  await gotoAndAssert(page, '/profiles.html');

  // open add profile form (best effort)
  const addBtn = page.getByRole('button', { name: /add/i }).first();
  if (await addBtn.isVisible().catch(()=>false)) {
    await addBtn.click();
  }

  // Fill name if field exists
  const nameInput = page.locator('input[name="name"], input#kidName, input[placeholder*="name" i]').first();
  await expect(nameInput).toBeVisible();
  await nameInput.fill('Test Kid');

  // Save/create
  const saveBtn = page.getByRole('button', { name: /create|save|add profile/i }).first();
  await saveBtn.click();

  // Verify appears
  await expect(page.locator('text=Test Kid')).toBeVisible();

  // Navigate away then back
  await page.goto('/phase1.html', { waitUntil: 'domcontentloaded' });
  await page.goto('/profiles.html', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('text=Test Kid')).toBeVisible();
});
