import { Page } from '@playwright/test';

import AppPage from './AppPage';
import AuthCallBackPage from './AuthCallBackPage';
import CreateAccountPage from './CreateAccountPage';
import DevicesPage from './DevicesPage';
import EmailPage from './EmailPage';
import LoginPage from './LoginPage';

class PageManager {
  private loginPage: LoginPage;

  private createAccountPage: CreateAccountPage;

  private authCallBackPage: AuthCallBackPage;

  private emailPage: EmailPage;

  private appPage: AppPage;

  private devicesPage: DevicesPage;

  constructor(page: Page) {
    this.loginPage = new LoginPage(page);
    this.createAccountPage = new CreateAccountPage(page);
    this.authCallBackPage = new AuthCallBackPage(page);
    this.emailPage = new EmailPage(page);
    this.appPage = new AppPage(page);
    this.devicesPage = new DevicesPage(page);
  }

  getLoginPage(): LoginPage {
    return this.loginPage;
  }

  getCreateAccountPage(): CreateAccountPage {
    return this.createAccountPage;
  }

  getAuthCallBackPage(): AuthCallBackPage {
    return this.authCallBackPage;
  }

  getEmailPage(): EmailPage {
    return this.emailPage;
  }

  getAppPage(): AppPage {
    return this.appPage;
  }

  getDevicesPage(): DevicesPage {
    return this.devicesPage;
  }
}

export default PageManager;
