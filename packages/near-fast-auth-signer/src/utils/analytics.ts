import { nanoid } from 'nanoid';
import * as rudderAnalytics from 'rudder-sdk-js';

import { networkId } from './config';

const ANALYTICS_KEYS = {
  testnet: '2R7K9phhzpFzk2zFIq2EFBtJ8BM',
  mainnet: '2RIih8mrVPUTQ9uWe6TFfwXzcMe'
};

const rudderAnalyticsKey = ANALYTICS_KEYS[networkId];
const DATA_PLANE_URL = 'https://near.dataplane.rudderstack.com';

let userAgentDetail: string;

async function getUserAgentDetails() {
  try {
    if (navigator.userAgentData) {
      const ua = await navigator.userAgentData.getHighEntropyValues(['platformVersion', 'model']);
      const { model, platformVersion } = ua;
      userAgentDetail = JSON.stringify({ userAgent: navigator.userAgent, platformVersion, model });
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
    rudderAnalytics.setAnonymousId(nanoid());
    window.rudderAnalytics = rudderAnalytics;
  } catch (e) {
    console.error('Error initializing analytics:', e);
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
    console.error('Error recording event:', e);
  }
}
