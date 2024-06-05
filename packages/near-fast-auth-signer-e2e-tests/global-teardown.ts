import * as fs from 'fs';

import { deleteUserByEmail, deleteAccount } from './utils/firebase';

const deleteMockAccount = async (account) => {
  switch (account.type) {
    case 'email':
      await deleteUserByEmail(account.email);
      break;
    case 'uid':
      await deleteAccount(account.uid);
      break;

    default:
      console.log('unknown account type', account);
      break;
  }
};

async function globalTeardown() {
  const { accounts } = JSON.parse(fs.readFileSync('testAccounts.json', 'utf-8'));
  // eslint-disable-next-line no-return-await
  await Promise.all(accounts.map(async (account) => await deleteMockAccount(account)));
  fs.writeFileSync('testAccounts.json', JSON.stringify({ accounts: [] }, null, 2));
}

export default globalTeardown;
