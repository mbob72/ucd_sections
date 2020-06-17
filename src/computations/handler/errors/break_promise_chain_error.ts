class BreakPromiseChainError extends Error {
    constructor() {
        const message = 'Promise chain is broken!';
        super(message);
        Object.setPrototypeOf(this, BreakPromiseChainError.prototype);
        this.message = message;
    }
}

export default BreakPromiseChainError;
