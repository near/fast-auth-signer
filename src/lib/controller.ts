class FastAuthController {
    private privateKey: Window | null;
    private publicKey: Window | null;

    constructor() { }

    isSignedIn() {
        return !!this.privateKey;
    }

    getPublicKey() { }

    sendMessage(payload: any, receiverWindow: Window | null) {
        if (receiverWindow) {
            receiverWindow.postMessage(payload, '*');
        } else {
            console.error('Unable to send message to parent iframe: parent window is not available.');
        }
    }
}

export default new FastAuthController();