export async function waitForIframeReady(page, iframeSelector) {
  // Wait for the iframe to be present in the DOM
  const iframeLocator = page.locator(iframeSelector);
  console.log('iframeLocator', iframeLocator);
  await iframeLocator.waitFor();

  // Switch to the iframe context
  const frame = await (await iframeLocator.elementHandle()).contentFrame();
  console.log('frame', frame);
  // Wait for the iframe to load fully
  await frame.waitForLoadState('networkidle'); // Wait for no network activity
  await page.waitForTimeout(20000);

  await frame.waitForSelector('//button[@data-test-id="add-device-continue-button"]', { state: 'visible' }); // Adjust selector as needed

  return frame; // Return the iframe's frame context for further actions
}

/* eslint-disable no-await-in-loop */
export async function waitForElement(page, elementSelector, iframeSelector = null, timeout = 30000, interval = 1000) {
  let elapsed = 0;
  while (elapsed < timeout) {
    try {
      let elementExists = false;
      if (iframeSelector) {
        const frameLocator = page.frameLocator(iframeSelector);
        const elementLocator = frameLocator.locator(elementSelector);
        console.log('Checking element within iframe:', elementLocator);
        elementExists = await elementLocator.count() > 0;
      } else {
        elementExists = await page.locator(elementSelector).count() > 0;
      }

      if (elementExists) {
        console.log('Element is now available.');
        return true;
      }
    } catch (error) {
      console.error(`Error while trying to find element: ${error.message}`);
      if (error.message.includes('Execution context was destroyed')
                  || error.message.includes('Target closed')
                  || error.message.includes('Page closed')) {
        console.error('Encountered a context disruption. Waiting briefly before retrying...');
        await page.waitForTimeout(interval); // Give some time for the context to stabilize
      } else {
        // If it's an unexpected error, rethrow it to avoid suppressing important errors
        throw error;
      }
    }
    // Wait for the specified interval before retrying
    await page.waitForTimeout(interval);
    elapsed += interval;
    console.log(`Retrying to find element... ${elapsed}/${timeout}ms elapsed`);
  }

  console.error('Failed to find the element within the specified timeout.');
  return false;
}
