import { test, expect } from '@playwright/test';
import { gotoAndAssert, clearAppData, handlePasswordDialogs } from '../utils/helpers';

test.beforeEach(async ({ page }) => {
  await clearAppData(page);
  await handlePasswordDialogs(page, '1234');
});

test('Kid mode can be turned on and then unlocked back to Parent without refresh', async ({ page }) => {
  await gotoAndAssert(page, '/index.html');

  const toggle = page.locator('#kidModeToggle');
  await expect(toggle).toBeVisible();

  // Starts in parent (kidmode off)
  await expect(page.locator('body')).not.toHaveClass(/kidmode/);

  // Turn kid mode ON (no password)
  await toggle.click();
  await expect(page.locator('body')).toHaveClass(/kidmode/);
  await expect(toggle).toContainText(/Kid mode on/i);

  // Turn kid mode OFF (requires password flow)
  await toggle.click();

  // should unlock (kidmode removed) without needing refresh
  await expect(page.locator('body')).not.toHaveClass(/kidmode/);
  await expect(toggle).toContainText(/Parent|Parent mode/i);
});
