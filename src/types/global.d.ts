/* eslint-disable no-unused-vars */
import FastAuthController from '../lib/controller';

export {};

declare global {
    interface Window {
        fastAuthController: FastAuthController;
    }
}
