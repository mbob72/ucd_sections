import functionParser from '../function';
import DataLink from '../../data_link';
import { DataParserError } from '../..';

const functions = {
    someFunction: jest.fn(() => 'someFunction result'),
    asyncFunction: () => Promise.resolve('asyncFunction result')
}

describe('Some additional tests for the functionParser', () => {
    it('Function parser returns an iterator', () => {
        expect(functionParser({ dataLink: new DataLink('$someFunction()') })).toEqual(expect.objectContaining({
            next: expect.any(Function),
            [Symbol.iterator]: expect.any(Function)
        }));
     })

     it('The passed dataLink must start with $', () => {
         const fP = functionParser({ dataLink: new DataLink('someFunction()') });
         const fn = () => fP.next();
         expect(fn).toThrowError(DataParserError.ERRORS.ITERATOR_ERROR);
     })

     it('Must return a reference to the function', () => {
        const fP = functionParser({ dataLink: new DataLink('$someFunction'), functions });
        const { value, done } = fP.next();
        expect(value).toBe(functions.someFunction);
        expect(done).toBeTruthy();
        expect(functions.someFunction.mock.calls.length).toEqual(0);
     })

     it('Must return a result of function', () => {
        const fP = functionParser({ dataLink: new DataLink('$someFunction()'), functions });
        let result = void 0;
        while(true) {
            const { value, done } = fP.next(result);
            result = value;
            if (done) break;
        }
        expect(result).toEqual('someFunction result');
        expect(functions.someFunction.mock.calls.length).toEqual(1);
     })

     it('Must return a value of resolved promise', async () => {
        const fP = functionParser({ dataLink: new DataLink('$asyncFunction()'), functions });
        let result = void 0;
        async function next(v) {
            const { value, done } = fP.next(v);
            await Promise.resolve(value).then((value) => {
                if (done) result = value;
                else next(value);
            })
        }
        await next();
        expect(result).toEqual('asyncFunction result');
     })
})