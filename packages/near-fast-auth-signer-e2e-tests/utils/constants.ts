import { Page } from 'playwright/test';

export const getFastAuthIframe = (page: Page) => page.frameLocator('#nfw-connect-iframe');
