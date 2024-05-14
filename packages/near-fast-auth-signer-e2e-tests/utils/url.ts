import { Page } from 'playwright/test';

export async function rerouteToCustomURL(page: Page, baseURL: string, path: string): Promise<void> {
  await page.route(`**${path}`, async (route) => {
    const originalRequest = route.request();
    const newURL = new URL(`${baseURL}${path}`);

    const response = await route.fetch({
      url:      newURL.toString(),
      method:   originalRequest.method(),
      headers:  originalRequest.headers(),
      postData: originalRequest.postData(),
    });

    await route.fulfill({
      response,
    });
  });
}
