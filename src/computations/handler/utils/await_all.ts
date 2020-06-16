/* eslint-disable @typescript-eslint/no-explicit-any */
import ValidationError from '../errors/validation_error';
import BreakPromiseChainError from '../errors/break_promise_chain_error';

/**
 * This method returns a promise, that awaits for all promise chains of the current form.
 */
const awaitAll = (chains: Promise<any>[]): { rejectCallback: (error: Error) => void, promise: Promise<any> } => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    let rejectControlPromise: (error: Error) => void = () => {};
    const controlPromise = new Promise((resolve, reject) => {
        rejectControlPromise = reject;
    });
    const promises: Promise<any>[] = [];
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
