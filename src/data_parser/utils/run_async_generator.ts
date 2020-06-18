/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Iterates iterator that can yield a simple value or a promise.
 */
const runAsyncGenerator = (iterator: Iterator<any, any, any>, resolve: (value: any) => void, reject: (value: any) => void): void => {
    const next = (v?: any): void => {
        try {
            const { value, done } = iterator.next(v);
            const p = Promise.resolve(value);
            if (done) p.then(resolve, reject);
            else p.then(next, reject);
        } catch (e) {
            reject(e);
        }
    };
    next();
};

export default runAsyncGenerator;
