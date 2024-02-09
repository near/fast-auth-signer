import { test, expect } from '@playwright/test';
import MailtrapUtil from "../utils/mailtrap_util";

test('has title', async ({ page }) => {

  const testingDate = new Date();

  const mailtrap = new MailtrapUtil();

  const dateTimeFormatted = mailtrap.CheckFormattedDate(testingDate);

  await page.goto('http://localhost:3030/');

  const walletSelector = page.locator('#ws-loaded');
  await walletSelector.waitFor();

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Fast Auth Test App/);
});
