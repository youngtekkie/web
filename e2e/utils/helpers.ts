import { expect, Page } from '@playwright/test';

  export async function gotoAndAssert(page: Page, path: string) {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(path, { waitUntil: 'domcontentloaded' });
    // Wait for injected chrome to appear
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('#site-footer')).toBeVisible();

    // allow any late JS to run
    await page.waitForTimeout(200);

    if (errors.length) {
      throw new Error(`Console/page errors on ${path}:
` + errors.slice(0, 8).join('\n'));
    }
  }

  export async function clearAppData(page: Page) {
    await page.addInitScript(() => {
      try {
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith('yta_')) localStorage.removeItem(k);
        }
      } catch (e) {}
    });
  }

  export async function handlePasswordDialogs(page: Page, password = '1234') {
    // Handles prompt/confirm dialogs used by the Kid/Parent mode flow.
    page.on('dialog', async (dialog) => {
      const msg = dialog.message().toLowerCase();
      const type = dialog.type();

      if (type === 'prompt') {
        // create or enter password
        await dialog.accept(password);
        return;
      }

      if (type === 'confirm') {
        // accept resets if asked, but generally say OK for flows that require confirm
        await dialog.accept();
        return;
      }

      // alert
      await dialog.accept();
    });
  }
