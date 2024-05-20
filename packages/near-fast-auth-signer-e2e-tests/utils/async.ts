export async function checkConditionUntilMet(page, checkFunction, maxRetries, interval) {
  let attempts = 0;

  async function recursiveCheck() {
    attempts += 1;
    const conditionMet = await checkFunction(page);

    if (conditionMet || attempts >= maxRetries) {
      return conditionMet;
    }
    await page.waitForTimeout(interval);
    return recursiveCheck();
  }

  return recursiveCheck();
}
