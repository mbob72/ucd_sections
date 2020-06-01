class BreakPromiseChainError extends Error {
    constructor () {
        const message = 'Promise chain is broken!'
        super(message)
        this.message = message
    }
}

export default BreakPromiseChainError
