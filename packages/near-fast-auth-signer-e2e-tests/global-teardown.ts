import { deletePublicKey, deleteAllTestAccounts } from './utils/firebase';
import { emptyTestAccountJSON, readTestAccountJSON } from './utils/queue';

async function globalTeardown() {
  const { accounts, publicKeys } = await readTestAccountJSON();
  console.log(`${accounts.length} accounts on firebase to delete`);
  // eslint-disable-next-line no-return-await
  await deleteAllTestAccounts(accounts);
  console.log(`${publicKeys.length} public keys on firebase to delete`);
  await Promise.all(publicKeys.map(async ({ publicKey }) => deletePublicKey(publicKey)));
  await emptyTestAccountJSON();
  console.log('Completed firebase cleanup');
}

export default globalTeardown;
