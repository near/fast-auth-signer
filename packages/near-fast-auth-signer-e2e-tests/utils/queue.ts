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

// eslint-disable-next-line no-promise-executor-return
const retryDelay = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// eslint-disable-next-line consistent-return
const lockFileWithRetry = async (filePath: string, retries = 5, delay = 100) => {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const release = await lockfile.lock(filePath);
      return release;
    } catch (error) {
      if (error.code === 'ELOCKED') {
        console.log('attempt count', attempt);
        if (attempt < retries - 1) {
          // eslint-disable-next-line no-await-in-loop
          await retryDelay(delay);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }
};

const processQueue = async () => {
  if (isWriting || writeQueue.length === 0) {
    return;
  }

  isWriting = true;
  const dataBatch = [...writeQueue];
  writeQueue = []; // Clear the queue after taking a snapshot

  let release;
  try {
    release = await lockFileWithRetry(FILE_PATH);

    const fileExists = await fs.pathExists(FILE_PATH);
    const fileContent = fileExists ? await fs.readJson(FILE_PATH) : {};
    const newContent = { ...fileContent };

    dataBatch.forEach((data) => {
      if ('publicKey' in data) {
        const { publicKey, accountId } = data;
        newContent.publicKeys = newContent.publicKeys
          ? [...newContent.publicKeys, { publicKey, accountId }] : [{ publicKey, accountId }];
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
