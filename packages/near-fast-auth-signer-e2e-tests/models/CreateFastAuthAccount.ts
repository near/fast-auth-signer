import { Page } from '@playwright/test';

class CreateAccountPage {
    page: Page
    constructor(page: Page) {
        this.page = page;
    }
    async navigate() {
        await this.page.goto(`/create-account`);
    }
}

export { CreateAccountPage };
