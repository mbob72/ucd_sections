class ValidationError extends Error {
    constructor(message = '') {
        super(message);
        Object.setPrototypeOf(this, ValidationError.prototype);
        this.message = message;
    }
}

export default ValidationError;
