import { test as base } from '@playwright/test';

export type TestOptions = {
  baseURL: string;
  relayerURL: string;
};

export const test = base.extend<TestOptions>({
  relayerURL: ['', { option: true }],
});
