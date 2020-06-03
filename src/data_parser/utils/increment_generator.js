const incrementGenerator = function* () {
    for (let i = 1; i < Number.MAX_SAFE_INTEGER; i++) yield i;
    throw new Error('The safe number range is over!'); // Impossible?
};
incrementGenerator.prototype.get = function () {
    return this.next().value;
};

export default incrementGenerator;
