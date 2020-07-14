import * as asyncComputations from '../async_computations';
import { toBoolean, toNumber, toString, toLowercase, toUpperCase } from '../functions';
import BreakPromiseChainError from '../handler/errors/break_promise_chain_error';
import { isExportDeclaration, JsxEmit } from 'typescript';

describe('Tests for builtin async computations', () => {

    it('Testing log computation', () => {
        console.warn = jest.fn();
        const input = { value: 'value', dataLink: 'link' };
        const env = { envParam: 'envValue' };
        const additional = { key: 'additional data' };

        const logComputation = asyncComputations.log('marker', additional);
        expect(logComputation).toEqual(expect.any(Function));
        const result = logComputation(input, env);
        expect(console.warn.mock.calls.length).toEqual(1);
        expect(console.warn.mock.calls[0][0]).toEqual(expect.stringContaining('marker'));
        expect(console.warn.mock.calls[0][1]).toStrictEqual({ input, env, additional });
        expect(result).toStrictEqual(input);

        const logComputationWithError = asyncComputations.log({}, additional);
        const fn = () => logComputationWithError(input, env);
        expect(fn).toThrow(Error);

        jest.clearAllMocks();
        const logComputationWithoutAdditional = asyncComputations.log('marker');
        logComputationWithoutAdditional(input, env);
        expect(console.warn.mock.calls.length).toEqual(1);
        expect(console.warn.mock.calls[0][0]).toEqual(expect.stringContaining('marker'));
        expect(console.warn.mock.calls[0][1]).toStrictEqual({ input, env, additional: void 0 });

        jest.clearAllMocks();
        const logComputationWithEmptyMark = asyncComputations.log();
        logComputationWithEmptyMark(input, env);
        expect(console.warn.mock.calls.length).toEqual(1);
        expect(console.warn.mock.calls[0][0]).toEqual(expect.stringContaining('log computation'));
        expect(console.warn.mock.calls[0][1]).toStrictEqual({ input, env, additional: void 0 });
    })

    it('Testing break computation', () => {
        const computation = asyncComputations.breakAction();
        expect(computation).toEqual(expect.any(Function));
        const fn = () => computation();
        expect(fn).toThrow(BreakPromiseChainError);
    })

    it('Testing value overriding', () => {
        const computation = asyncComputations.overrideInputValue('new/path/to/data', 'newValue');
        expect(computation).toEqual(expect.any(Function));
        const input = { value: 'value', dataLink: '@path/to/data' };
        const result = computation(input, {});
        expect(result).toStrictEqual({ value: 'newValue', dataLink: '@new/path/to/data' });

        const computationWithError = asyncComputations.overrideInputValue({}, 'newValue');
        const fn = () => computationWithError();
        expect(fn).toThrow(Error);
    })

    it('Write input value to the context', () => {
        console.warn = jest.fn();
        const context = {};
        const input = { value: 'value', dataLink: '@path/to/data' };
        const setValue = asyncComputations.setValue();
        expect(setValue).toEqual(expect.any(Function));
        const result = setValue(input, { context });
        expect(result).toStrictEqual(input);
        expect(context).toEqual(expect.objectContaining({ '@path/to/data': 'value' }));
        expect(console.warn.mock.calls.length).toEqual(0);
        const result2 = setValue(input, {});
        expect(result2).toStrictEqual(input);
        expect(console.warn.mock.calls.length).toEqual(1);
    })

    it('Testing update context call', () => {
        const context = { data: 'data in context' };
        const updateState = jest.fn();
        const input = { value: 'value', dataLink: '@path/to/data' };
        const computation = asyncComputations.updateContext();
        expect(computation).toEqual(expect.any(Function));
        const result = computation(input, { updateState, context });
        expect(result).toStrictEqual(input);
        expect(updateState.mock.calls.length).toEqual(1);
        expect(updateState.mock.calls[0][0]).toStrictEqual(context);
    })

    it('Testing black action', () => {
        const input = { value: 'value', dataLink: '@path/to/data' };
        const computation = asyncComputations.blankAction();
        expect(computation).toEqual(expect.any(Function));
        expect(computation(input)).toStrictEqual(input);
    })

    it('Testing branch action: true', () => {
        const input = { value: 'value', dataLink: '@path/to/data' };
        const env = { env: 'env value' };
        const trueFn = jest.fn((input) => input);
        const falseFn = jest.fn((input) => input);
        const computationTrue = asyncComputations.branchAction(true, trueFn, falseFn); // "$branchAction(true, $trueFn, $falseFn)"
        expect(computationTrue).toEqual(expect.any(Function));
        const result = computationTrue(input, env);
        expect(result).toStrictEqual(input);
        expect(trueFn.mock.calls.length).toEqual(1);
        expect(falseFn.mock.calls.length).toEqual(0);
        expect(trueFn.mock.calls[0][0]).toStrictEqual(input);
        expect(trueFn.mock.calls[0][1]).toStrictEqual(env);
    })

    it('Testing branch action: false', () => {
        const input = { value: 'value', dataLink: '@path/to/data' };
        const env = { env: 'env value' };
        const trueFn = jest.fn((input) => input);
        const falseFn = jest.fn((input) => input);
        const computationFalse = asyncComputations.branchAction(false, trueFn, falseFn); // "$branchAction(false, $trueFn, $falseFn)"
        expect(computationFalse).toEqual(expect.any(Function));
        const result = computationFalse(input, env);
        expect(result).toStrictEqual(input);
        expect(trueFn.mock.calls.length).toEqual(0);
        expect(falseFn.mock.calls.length).toEqual(1);
        expect(falseFn.mock.calls[0][0]).toStrictEqual(input);
        expect(falseFn.mock.calls[0][1]).toStrictEqual(env);
    })

    it('Testing branch action: blank action', () => {
        const input = { value: 'value', dataLink: '@path/to/data' };
        const computationTrue = asyncComputations.branchAction(true); // "$branchAction(true)"
        expect(computationTrue).toEqual(expect.any(Function));
        const result1 = computationTrue(input);
        expect(result1).toStrictEqual(input);

        const computationFalse = asyncComputations.branchAction(false); // "$branchAction(false)"
        expect(computationFalse).toEqual(expect.any(Function));
        const result2 = computationFalse(input);
        expect(result2).toStrictEqual(input);
    })

    it('Testing branch action: list of actions', async () => {
        const input = { value: 'value', dataLink: '@path/to/data' };
        const env = { env: 'env value' };
        const trueFn1 = jest.fn(input => ({ ...input, value: `trueFn1Result_${input.value}`  }));
        const trueFn2 = jest.fn(input => input);
        const falseFn = jest.fn();
        const computation = asyncComputations.branchAction(true, [ trueFn1, trueFn2 ], falseFn); // "$branchAction(true, [ $trueFn1, $trueFn2 ], $falseFn)"
        const result = computation(input, env);

        expect(Promise.resolve(result)).toBe(result); // a Promise has been returned.

        await expect(result).resolves.toEqual(expect.objectContaining({ value: `trueFn1Result_${input.value}`, dataLink: '@path/to/data' }));

        expect(trueFn1.mock.calls.length).toEqual(1);
        expect(trueFn1.mock.calls[0][0]).toEqual(input);
        expect(trueFn1.mock.calls[0][1]).toEqual(env);

        expect(trueFn2.mock.calls.length).toEqual(1);
        expect(trueFn2.mock.calls[0][0]).toEqual({ value: `trueFn1Result_${input.value}`, dataLink: '@path/to/data' });
        expect(trueFn2.mock.calls[0][1]).toEqual(env);

        expect(falseFn.mock.calls.length).toEqual(0);
    })

    it('Testing branch action: async functions', async () => {
        const input = { value: 'value', dataLink: '@path/to/data' };
        const env = { env: 'env value' };
        const trueFn1 = jest.fn(input => Promise.resolve({ ...input, value: `trueFn1Result_${input.value}`  }));
        const trueFn2 = jest.fn(input => new Promise((resolve) => { setTimeout(() => resolve(input), 100); }));
        const falseFn = jest.fn();
        const computation = asyncComputations.branchAction(true, [ trueFn1, trueFn2 ], falseFn); // "$branchAction(true, [ $trueFn1, $trueFn2 ], $falseFn)"
        const result = computation(input, env);

        expect(Promise.resolve(result)).toBe(result); // a Promise has been returned.

        await expect(result).resolves.toEqual(expect.objectContaining({ value: `trueFn1Result_${input.value}`, dataLink: '@path/to/data' }));

        expect(trueFn1.mock.calls.length).toEqual(1);
        expect(trueFn1.mock.calls[0][0]).toEqual(input);
        expect(trueFn1.mock.calls[0][1]).toEqual(env);

        expect(trueFn2.mock.calls.length).toEqual(1);
        expect(trueFn2.mock.calls[0][0]).toEqual({ value: `trueFn1Result_${input.value}`, dataLink: '@path/to/data' });
        expect(trueFn2.mock.calls[0][1]).toEqual(env);

        expect(falseFn.mock.calls.length).toEqual(0);
    })

    it('Testing branch action, errors: empty array', () => {
        const input = { value: 'value', dataLink: '@path/to/data' };
        const env = { env: 'env value' };
        const falseFn = input => input;
        const computation = asyncComputations.branchAction(true, [ ], falseFn); // "$branchAction(true, [ ], $falseFn)"
        const fn = () => computation(input, env);
        expect(fn).toThrow(Error);
    })

    it('Testing branch action, errors: not a function #1', async () => {
        const input = { value: 'value', dataLink: '@path/to/data' };
        const env = { env: 'env value' };
        const trueFn1 = jest.fn(input => input);
        const trueFn2 = jest.fn(input => input);
        const falseFn = jest.fn();
        const computation = asyncComputations.branchAction(true, [ trueFn1, {}, trueFn2 ], falseFn); // "$branchAction(true, [ $trueFn1, {}, $trueFn2 ], $falseFn)"
        const result = computation(input, env);

        expect(Promise.resolve(result)).toBe(result); // a Promise has been returned.

        await expect(result).rejects.toThrow(Error);
        expect(trueFn1.mock.calls.length).toEqual(1);
        expect(trueFn2.mock.calls.length).toEqual(0);
    })

    it('Testing branch action, errors: not a function #2', async () => {
        const input = { value: 'value', dataLink: '@path/to/data' };
        const env = { env: 'env value' };
        const falseFn = jest.fn();
        const computation = asyncComputations.branchAction(true, {}, falseFn); // "$branchAction(true, {}, $falseFn)"
        const fn = () => computation(input, env);

        expect(fn).toThrow(Error);
    })

    it('Testing branch action, errors: error in array functions', async () => {
        const input = { value: 'value', dataLink: '@path/to/data' };
        const env = { env: 'env value' };
        const trueFn1 = jest.fn(input => input);
        const trueFn2 = () => {
            throw new Error('Test error');
        };
        const trueFn3 = jest.fn(input => input);
        const falseFn = jest.fn();
        const computation = asyncComputations.branchAction(true, [ trueFn1, trueFn2, trueFn3 ], falseFn); // "$branchAction(true, [ $trueFn1, {}, $trueFn2 ], $falseFn)"
        const result = computation(input, env);

        expect(Promise.resolve(result)).toBe(result); // a Promise has been returned.

        await expect(result).rejects.toThrowError('Test error');
        expect(trueFn1.mock.calls.length).toEqual(1);
        expect(trueFn3.mock.calls.length).toEqual(0);
    })

    it('Testing run action: single callback', () => {
        const out = { value: 'out value', dataLink: '@path/to/data/for/out/value' };
        const input = { value: jest.fn(() => out), dataLink: '@path/to/data' };
        const env = { env: 'env value' };
        const computation = asyncComputations.runAction(); // "$runAction()"

        expect(computation).toEqual(expect.any(Function));

        const result = computation(input, env);

        expect(result).toStrictEqual(out);
        expect(input.value.mock.calls.length).toEqual(1);
        expect(input.value.mock.calls[0][0]).toStrictEqual({ value: null, dataLink: '' });
        expect(input.value.mock.calls[0][1]).toStrictEqual(env);
    })

    it('Testing run action: array of callbacks', async () => {
        const out = { value: 'value out', dataLink: '@path/to/data/from/out' }
        const fn1 = jest.fn(() => out);
        const fn2 = jest.fn(input => input)
        const input = { value: [ fn1, fn2 ], dataLink: '@path/to/data' };
        const env = { env: 'env value' };
        const computation = asyncComputations.runAction(); // "$runAction()"

        expect(computation).toEqual(expect.any(Function));

        const result = computation(input, env);

        expect(Promise.resolve(result)).toBe(result); // a Promise has been returned.

        await expect(result).resolves.toStrictEqual(out);

        expect(fn1.mock.calls.length).toEqual(1);
        expect(fn1.mock.calls[0][0]).toStrictEqual({ value: null, dataLink: '' })
        expect(fn1.mock.calls[0][1]).toStrictEqual(env)

        expect(fn2.mock.calls.length).toEqual(1);
        expect(fn2.mock.calls[0][0]).toStrictEqual(out);
        expect(fn2.mock.calls[0][1]).toStrictEqual(env)
    })

    it('Testing run action: array of async callbacks', async () => {
        const out = { value: 'value out', dataLink: '@path/to/data/from/out' }
        const fn1 = jest.fn(() => Promise.resolve(out));
        const fn2 = jest.fn(input => new Promise(resolve => setTimeout(() => resolve(input), 100)));
        const fn3 = input => input;
        const input = { value: [ fn1, fn2, fn3 ], dataLink: '@path/to/data' };
        const env = { env: 'env value' };
        const computation = asyncComputations.runAction(); // "$runAction()"

        expect(computation).toEqual(expect.any(Function));

        const result = computation(input, env);

        expect(Promise.resolve(result)).toBe(result); // a Promise has been returned.

        await expect(result).resolves.toStrictEqual(out);

        expect(fn1.mock.calls.length).toEqual(1);
        expect(fn1.mock.calls[0][0]).toStrictEqual({ value: null, dataLink: '' })
        expect(fn1.mock.calls[0][1]).toStrictEqual(env)

        expect(fn2.mock.calls.length).toEqual(1);
        expect(fn2.mock.calls[0][0]).toStrictEqual(out);
        expect(fn2.mock.calls[0][1]).toStrictEqual(env)
    })

    it('Testing run action, errors: is not a function #1', () => {
        const input = { value: Object.create(null), dataLink: '@path/to/data' };
        const env = { env: 'env value' };
        const computation = asyncComputations.runAction(); // "$runAction()"
        expect(computation).toEqual(expect.any(Function));
        const fn = () => computation(input, env);
        expect(fn).toThrow(Error);
    })

    it('Testing run action, errors: is not a function #2', async () => {
        const fn1 = jest.fn();
        const fn2 = Object.create(null);
        const fn3 = jest.fn()
        const input = { value: [ fn1, fn2, fn3 ], dataLink: '@path/to/data' };
        const env = { env: 'env value' };
        const computation = asyncComputations.runAction(); // "$runAction()"

        expect(computation).toEqual(expect.any(Function));

        const result = computation(input, env);

        expect(Promise.resolve(result)).toBe(result); // a Promise has been returned.

        await expect(result).rejects.toThrow(Error);

        expect(fn1.mock.calls.length).toEqual(1);
        expect(fn1.mock.calls[0][0]).toStrictEqual({ value: null, dataLink: '' })
        expect(fn1.mock.calls[0][1]).toStrictEqual(env)

        expect(fn3.mock.calls.length).toEqual(0);
    })

    it('Testing run action, errors: empty array of callbacks', () => {
        const input = { value: [ ], dataLink: '@path/to/data' };
        const env = { env: 'env value' };
        const computation = asyncComputations.runAction(); // "$runAction()"
        const fn = () => computation(input, env);
        expect(fn).toThrow(Error);
    })

    it('Testing run action, errors: error in array callbacks', async () => {
        const fn1 = jest.fn();
        const fn2 = () => {
            throw new Error('Test error');
        };
        const fn3 = jest.fn();
        const input = { value: [ fn1, fn2, fn3 ], dataLink: '@path/to/data' };
        const env = { env: 'env value' };
        const computation = asyncComputations.runAction(); // "$runAction()"

        expect(computation).toEqual(expect.any(Function));

        const result = computation(input, env);

        expect(Promise.resolve(result)).toBe(result); // a Promise has been returned.

        await expect(result).rejects.toThrowError('Test error');
        expect(fn1.mock.calls.length).toEqual(1);
        expect(fn3.mock.calls.length).toEqual(0);
    })

    it('Testing apply filters action: general', () => {
        const input = { value: {}, dataLink: '@path/to/data' };
        const fn = jest.fn(v => v);
        const computation = asyncComputations.applyFilters(fn, toString, fn, toUpperCase, fn);
        expect(computation).toEqual(expect.any(Function));
        const result = computation(input);
        const resultValue = String(input.value).toUpperCase();
        expect(result).toStrictEqual({ value: resultValue, dataLink: '@path/to/data' });
        expect(fn.mock.calls.length).toEqual(3);
        expect(fn.mock.calls[0][0]).toEqual(input.value);
        expect(fn.mock.calls[1][0]).toEqual(String(input.value));
        expect(fn.mock.calls[2][0]).toEqual(resultValue);
    })

    it('Testing apply filters action: empty filters', () => {
        const input = { value: {}, dataLink: '@path/to/data' };
        const computation = asyncComputations.applyFilters();
        expect(computation).toEqual(expect.any(Function));
        const result = computation(input);
        expect(result).toStrictEqual(input);
    })

    it('Testing apply filters action: filter is not a function', () => {
        const input = { value: {}, dataLink: '@path/to/data' };
        const fn1 = jest.fn(v => v);
        const fn2 = jest.fn(v => v);
        const computation = asyncComputations.applyFilters(fn1, Object.create(null), fn2);
        expect(computation).toEqual(expect.any(Function));
        const fn = () => computation(input);
        expect(fn).toThrow(Error);
    })

    it('Testing delay action: general', async () => {
        const input = { value: 'value', dataLink: '@path/to/data' };
        const computation = asyncComputations.delay(1000);
        expect(computation).toEqual(expect.any(Function));
        const start = performance.now();
        const result = computation(input);
        expect(Promise.resolve(result)).toBe(result);
        await expect(result).resolves.toStrictEqual(input);
        const diff = performance.now() - start;
        expect(diff).toBeGreaterThan(1000);
    })

    it('Testing dalay action: timeout must be a number', () => {
        const fn = () => asyncComputations.delay({});
        expect(fn).toThrow(Error);
    })

})