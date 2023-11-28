import { test, expect } from '@playwright/test';

const testEmail = ""

// put test IDs on all page items FIRST, then commit and PR 
// striings at the top of the model. data-test-id=landingPageCreateAccount
// create an object for each page that describes all the things that we can do on that page.

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

    // Expects page to show sign-in on completion
    await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});