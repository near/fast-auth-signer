import { deleteUserByEmail, deleteAccount, deletePublicKey } from './utils/firebase';
import { DeleteAccount, emptyTestAccountJSON, readTestAccountJSON } from './utils/queue';

const deleteMockAccount = async (account: DeleteAccount) => {
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
  const { accounts, publicKeys } = await readTestAccountJSON();
  console.log(`${accounts.length} accounts on firebase to delete`);
  // eslint-disable-next-line no-return-await
  await Promise.all(accounts.map(async (account) => await deleteMockAccount(account)));
  console.log(`${publicKeys.length} public keys on firebase to delete`);
  await Promise.all(publicKeys.map(async ({ publicKey }) => deletePublicKey(publicKey)));
  await emptyTestAccountJSON();
  console.log('Completed firebase cleanup');
}

export default globalTeardown;
