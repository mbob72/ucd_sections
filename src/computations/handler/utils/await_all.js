import ValidationError from '../errors/validation_error';
import BreakPromiseChainError from '../errors/break_promise_chain_error';

/**
 * This method returns a promise, that awaits for all promise chains of the current form.
 * @param {Array<Promise>} chains
 * @returns {{rejectCallback: null, promise: Promise<Object[]>}}
 */
const awaitAll = (chains) => {
    let rejectControlPromise = null;
    const controlPromise = new Promise((resolve, reject) => {
        rejectControlPromise = reject;
    });
    const promises = [];
    for (let i = 0; i < chains.length; i++) {
        const chain = chains[i];
        const promise = new Promise((resolve) => {
            if (chain instanceof Promise) {
                chain.then(
                    (value) => {
                        resolve({ status: 'success', data: value });
                    },
                    (error) => {
                        let status = 'unknownError';
                        switch (true) {
                            case error instanceof ValidationError:
                                status = 'validationError';
                                break;
                            case error instanceof BreakPromiseChainError:
                                status = 'breakError';
                                break;
                        }
                        resolve({ status, error });
                    }
                );
            } else
                throw new Error(
                    'SectionsComputation: chains must contain only promises.'
                );
        });
        promises.push(promise);
    }

    const awaitPromise = Promise.all(promises);
    const mainPromise = Promise.race([ controlPromise, awaitPromise ]);

    return { rejectCallback: rejectControlPromise, promise: mainPromise };
};

export default awaitAll;
