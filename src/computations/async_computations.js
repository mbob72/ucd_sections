import BreakPromiseChainError from './handler/errors/break_promise_chain_error';

/** For debugging. */
export const log = (marker = null, additional = null) => {
    return (input, env) => {
        if (marker && typeof marker !== 'string')
            throw new Error(
                '[error] log computation: marker must be a string.'
            );
        console.warn(`[debug] ${marker || 'log computation'}:`, {
            input,
            env,
            additional,
        });
        return input;
    };
};

/** Stub-action that breaks computations. */
export const breakAction = () => {
    return () => {
        throw new BreakPromiseChainError();
    };
};

/**
 * Overrides the input value and passes the one to the next computation.
 * This method expects a link without the dog symbol, for example: "/data/products" instead of "@/data/products".
 * And the passed link must be an absolute link (started with "/" symbol).
 */
export const overrideInputValue = (dataLink, value) => {
    return () => {
        dataLink = '@' + dataLink;
        return { dataLink, value };
    };
};

/** Writes the passed value to the context. */
export const setValue = () => {
    return (input, { context, currentSchemaObject }) => {
        const { dataLink, value } = input;
        context[dataLink] = value;
        return input;
    };
};

/** Sends the context to a state before the promise chain is completed. */
export const updateContext = () => {
    return (input, { updateState, context }) => {
        // todo: is it necessary to make a copy of the context?
        updateState(context);
        return input;
    };
};

/**
 * This computation expects a function or a list of functions in the input.value param and calls the one with the passed environment.
 */
export const runAction = () => {
    return (input, env) => {
        const { value: action } = input;
        if (Array.isArray(action)) {
            if (!action.length)
                throw new Error(
                    '[error] runAction: array of function can not be empty.'
                );
            return action.reduce((acc, func) => {
                if (typeof func !== 'function') {
                    return acc.then(() => {
                        throw new Error(
                            `[error] runAction: array mus contain a list of functions. The type '${typeof func} is given.'`
                        );
                    });
                }
                return acc.then((value) => func(value, env));
            }, Promise.resolve({}));
        }
        if (typeof action !== 'function')
            throw new Error(
                '[error] runAction: input.value must be a function.'
            );
        return action({}, env);
    };
};

/**
 * Applies the passed pure functions to the passed input value.
 * The filters array should be a list of synchronous pure functions, that clarify the passed value.
 */
export const applyFilters = (...filters) => {
    return (input) => {
        if (!filters.length) return input;
        let { value } = input;
        for (const filter of filters) {
            if (typeof filter !== 'function')
                throw Error('[error] applyFilters: filter must be a function.');
            value = filter(value);
        }
        return { ...input, value };
    };
};

const debouncedPromises = new Map();
/**
 * Process only last change when the passed time is left.
 * @param {function} computation
 * @param {number} time
 * @returns {function(*=, *=): Promise<unknown>}
 */
export const debounce = (computation, time) => {
    if (typeof computation !== 'function')
        throw new Error(
            '[error] debounce: The computation must be a function.'
        );
    time = Number(time);
    if (Number.isNaN(time))
        throw new Error('[error] debounce: The time must be a number.');
    return (input, env) => {
        return new Promise((resolve, reject) => {
            const {
                currentSchemaObject: { _objectId_: key },
            } = env;
            if (!Number.isInteger(key))
                throw new Error('[error] debounce: The key must be a number.');
            const resolvePromise = (value) => {
                resolve(value);
                debouncedPromises.delete(key);
            };
            const rejectPromise = (err) => {
                reject(err);
                debouncedPromises.delete(key);
            };

            if (debouncedPromises.has(key)) {
                const { reject, timeoutId } = debouncedPromises.get(key);
                reject(new BreakPromiseChainError());
                clearTimeout(timeoutId);
                debouncedPromises.delete(key);
            }

            const timeoutId = setTimeout(() => {
                try {
                    const res = computation(input, env);
                    if (res instanceof Promise) {
                        res.then(resolvePromise, rejectPromise);
                    } else {
                        resolvePromise(res);
                    }
                } catch (e) {
                    rejectPromise(e);
                }
            }, time);

            debouncedPromises.set(key, { reject, timeoutId });
        });
    };
};

/** Makes a pause in the current computation chain */
export const delay = (timeOut = 0) => {
    timeOut = Number(timeOut);
    if (Number.isNaN(timeOut))
        throw new Error('[error] Delay: delay value must be a number.');
    return (input, env) => {
        return new Promise((resolve) =>
            setTimeout(() => resolve(input), timeOut)
        );
    };
};
