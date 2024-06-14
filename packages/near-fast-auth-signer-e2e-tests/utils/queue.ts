import path from 'path';

import fs from 'fs-extra';
import lockfile from 'proper-lockfile';

export type DeleteAccount = {
  type: 'email' | 'uid';
  email?: string;
  uid?: string;
};

export type DeletePublicKey = {
  publicKey: string;
  accountId: string;
};

export type JobData = {
  filePath: string;
  data: DeleteAccount | DeletePublicKey;
};

const FILE_PATH = path.join(__dirname, '../testAccounts.json');
let writeQueue: (DeleteAccount | DeletePublicKey)[] = [];
let isWriting = false;

const processQueue = async () => {
  if (isWriting || writeQueue.length === 0) {
    return;
  }

  isWriting = true;
  const dataBatch = [...writeQueue];
  writeQueue = []; // Clear the queue after taking a snapshot

  let release;
  try {
    release = await lockfile.lock(FILE_PATH);

    const fileExists = await fs.pathExists(FILE_PATH);
    const fileContent = fileExists ? await fs.readJson(FILE_PATH) : {};
    const newContent = { ...fileContent };

    dataBatch.forEach((data) => {
      if ('publicKey' in data) {
        const { publicKey, accountId } = data;
        newContent.publicKeys = newContent.publicKeys ? [...newContent.publicKeys, { publicKey, accountId }] : [{ publicKey, accountId }];
      } else {
        newContent.accounts = newContent.accounts ? [...newContent.accounts, data] : [data];
      }
    });

    await fs.writeJson(FILE_PATH, newContent, { spaces: 2 });
  } catch (error) {
    console.error('Error processing job:', error);
  } finally {
    if (release) {
      await release();
    }
    isWriting = false;
    processQueue(); // Check if there are more items in the queue to process
  }
};

type TestAccountJSON = {
  accounts: DeleteAccount[];
  publicKeys: DeletePublicKey[];
};

export const readTestAccountJSON = async (): Promise<TestAccountJSON> => fs.readJson(FILE_PATH);

export const emptyTestAccountJSON = async (): Promise<TestAccountJSON> => fs
  .writeJson(FILE_PATH, { accounts: [], publicKeys: [] }, { spaces: 2 });

export const addToDeleteQueue = async (data: DeleteAccount | DeletePublicKey) => {
  writeQueue.push(data);
  await processQueue();
};
