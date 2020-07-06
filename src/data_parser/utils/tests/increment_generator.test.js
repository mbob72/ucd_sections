import incrementGenerator from '../increment_generator';

describe('Testing the increment_generator', () => {
    it('Call without new statement', () => {
        const fn = () => incrementGenerator();
        expect(fn).toThrowError(Error);
    })

    it('Instance contains a get() function', () => {
        const gen = new incrementGenerator();
        expect(new incrementGenerator())
            .toEqual(expect.objectContaining({ get: expect.any(Function) }));
    })

    it('Get function returns a number and starts from "1"', () => {
        const gen = new incrementGenerator();
        const id = gen.get();
        expect(id).toEqual(expect.any(Number));
        expect(id).toEqual(1);
    })

    it('Sequence of incremental numbers', () => {
        const gen = new incrementGenerator();
        const arr = [];
        const controlArr = [];
        for (let i = 1; i < 10000; i++) {
            arr.push(gen.get());
            controlArr.push(i);
        }
        expect(arr).toEqual(controlArr);
    })
});