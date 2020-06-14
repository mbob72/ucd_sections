class ValidationError extends Error {
    constructor(message = '') {
        super(message);
        this.message = message;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

export default ValidationError;
