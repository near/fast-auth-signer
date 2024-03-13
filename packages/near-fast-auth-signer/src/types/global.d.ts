/* eslint-disable no-unused-vars */
import FastAuthController from '../lib/controller';
import FirestoreController from '../lib/firestoreController';

export {};

declare global {
    interface Window {
        fastAuthController: FastAuthController;
        firestoreController: FirestoreController;
        rudderAnalytics: any;
    }
    interface Navigator {
        userAgentData?: {
            getHighEntropyValues(keys: string[]): Promise<{ [key: string]: string }>;
        }
    }
}
