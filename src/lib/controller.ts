class FastAuthController {
    private privateKey: Window | null;
    private publicKey: Window | null;

    constructor() { }

    isSignedIn() {
        return !!this.privateKey;
    }

    getPublicKey() { }
    getAccounts() { }
    signTransaction() { }
    signDelegateAction() { }
}

export default new FastAuthController();