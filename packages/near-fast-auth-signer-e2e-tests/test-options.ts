import { test as base } from '@playwright/test';

export type TestOptions = {
  baseURL: string;
  relayerURL: string;
};

export const test = base.extend<TestOptions>({
  relayerURL: ['http://127.0.0.1:3030', { option: true }],
});
