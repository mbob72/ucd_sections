/**
 * Iterates iterator that can yield a simple value or a promise.
 * @param {Iterator} iterator
 * @param {Function} resolve
 * @param {Function} reject
 */
const runAsyncGenerator = (iterator, resolve, reject) => {
    const next = (v) => {
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
