/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Iterates iterator that can yield a simple value or a promise.
 */
const runAsyncGenerator = (iterator: Iterator<any, any, any>, resolve: (value: any) => void, reject: (value: any) => void): void => {
    const next = (v?: any): void => {
        try {
            const { value, done } = iterator.next(v);
            if (done) {
                if (value instanceof Promise) value.then(resolve, reject);
                else resolve(value);
            } else {
                if (value instanceof Promise) value.then(next, reject);
                else next(value);
            }
        } catch (e) {
            reject(e);
        }
    };
    next();
};

export default runAsyncGenerator;
