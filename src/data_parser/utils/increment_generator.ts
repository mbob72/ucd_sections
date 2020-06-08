const generator = function* (): Generator<number, never, unknown> {
    for (let i = 1; i < Number.MAX_SAFE_INTEGER; i++) yield i;
    throw new Error('The safe number range is over!'); // Impossible?
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
const incrementGenerator = function (this: any): void {
    const gen = generator();
    this.gen = gen;
};
incrementGenerator.prototype.get = function (): number {
    return this.gen.next().value;
};

export default incrementGenerator;
