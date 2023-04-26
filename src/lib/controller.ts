import * as nearAPI from 'near-api-js';

import { createKey } from '@near-js/biometric-ed25519';
import { networks } from '../utils/constants';

const { actionCreators } = require('@near-js/transactions');
const { transfer } = actionCreators;

class FastAuthController {
    private privateKey: string | null;
    private publicKey: string | null;
    private keyStore: any;
    private near: any;
    private activeAccountId: string;

    init({ networkId }) {
        this.activeAccountId = '';

        this.keyStore = new nearAPI.keyStores.BrowserLocalStorageKeyStore();
        this.near = new nearAPI.Near({
            ...networks[networkId],
            deps: { keyStore: this.keyStore },
        });
    }

    isSignedIn() {
        return !!this.privateKey;
    }

    async getPublicKey(accountId: string) {
        const keyPair = await createKey(accountId);
        const publicKey = keyPair.getPublicKey().toString();
        // const privateKey = keyPair.toString();

        return publicKey
    }

    async getAccounts() {
        if (this.activeAccountId != undefined && this.activeAccountId != null) {
            const accountObj = new nearAPI.Account(this.near.connection, this.activeAccountId);
            return [accountObj];
        }

        return []
    }

    async signAndSendTransaction(params) {
        if (!this.isSignedIn()) return

        console.log('sign and send txn params: ', params)
        const { receiverId, actions } = params;

        let res;
        try {

        } catch (e) {
            console.warn(e);
        }
    }

    async signDelegateAction({ amount, receiverId, senderAccount }) {
        const delegate = await senderAccount.signedDelegate({
            actions: [transfer(amount)],
            blockHeightTtl: 60,
            receiverId,
        });

        return delegate;
    }

}

export default new FastAuthController();