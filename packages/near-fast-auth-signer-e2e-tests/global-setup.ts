import { initializeAdmin } from './utils/firebase';

async function globalSetup() {
  initializeAdmin();
}

export default globalSetup;
