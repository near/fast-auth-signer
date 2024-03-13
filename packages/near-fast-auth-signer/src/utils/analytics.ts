import * as rudderAnalytics from 'rudder-sdk-js';
import { v4 as uuidv4 } from 'uuid';

import { networkId } from './config';

const ANALYTICS_KEYS = {
  testnet: '2R7K9phhzpFzk2zFIq2EFBtJ8BM',
  mainnet: '2RIih8mrVPUTQ9uWe6TFfwXzcMe'
};

const rudderAnalyticsKey = ANALYTICS_KEYS[networkId === 'testnet' ? 'testnet' : 'mainnet'];
const DATA_PLANE_URL = 'https://near.dataplane.rudderstack.com';

let userAgentDetail: string;

declare global {
  interface Window {
    rudderAnalytics: any;
  }
  interface Navigator {
    userAgentData?: {
      getHighEntropyValues(keys: string[]): Promise<{ [key: string]: string }>;
    }
  }
}

async function getUserAgentDetails() {
  try {
    if (navigator.userAgentData) {
      const ua = await navigator.userAgentData.getHighEntropyValues(['platformVersion', 'model']);
      const { model, platformVersion } = ua;
      userAgentDetail = `${navigator.userAgent}; Platform Version: ${platformVersion}; Model: ${model}`;
    } else {
      userAgentDetail = navigator.userAgent;
    }
  } catch (error) {
    console.error('Error getting user agent details:', error);
    userAgentDetail = navigator.userAgent;
  }
}

export async function initAnalytics() {
  if (window.rudderAnalytics) return;
  await getUserAgentDetails();
  try {
    rudderAnalytics.load(rudderAnalyticsKey, DATA_PLANE_URL);
    rudderAnalytics.setAnonymousId(uuidv4());
    window.rudderAnalytics = rudderAnalytics;
  } catch (e) {
    console.error(e);
  }
}

export function recordEvent(eventLabel: string, properties?: Record<string, string>) {
  if (!window.rudderAnalytics) return;
  try {
    rudderAnalytics.track(eventLabel, {
      ...properties,
      url: decodeURIComponent(window.location.href),
      userAgentDetail
    });
  } catch (e) {
    console.error(e);
  }
}
