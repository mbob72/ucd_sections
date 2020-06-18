export default (item: unknown): boolean => {
    return Object.prototype.toString.call(item) === '[object Object]';
};