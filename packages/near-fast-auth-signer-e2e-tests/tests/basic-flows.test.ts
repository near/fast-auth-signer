import { test, expect } from '@playwright/test';

const testEmail = ""

test.beforeEach(async ({ page }) => {
    await page.goto(' http://localhost:3000/');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await page.close();
  });

test('basic flow chrome', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
    await expect(page.getByRole('paragraph', { name: 'Please enter your email' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();

    // Enter an email.
    await page.getByLabel('email').fill(testEmail);

    // Click the link.
    await page.getByText('Continue').click();

    // Expects page to have a heading with the name of Installation.
    await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});