import '../../../../utils/patches';
import { getHandler } from '../index';
import * as asyncComputations from '../../../async_computations';
import * as functions from '../../../functions';
import * as experimentalComputations from '../../../experimental';
import BreakPromiseChainError from '../../errors/break_promise_chain_error';
import ValidationError from '../../errors/validation_error';

const updateState = jest.fn();
const computationMock = jest.fn((input, env) => input);
const generalComputations = {
    ...functions,
    ...asyncComputations,
    ...experimentalComputations,
    simpleFunction: () => ({ value: 'value from simple function', dataLink: '@simple/function/data/link' }),
    readySyncComputation: (input, env) => {
        return input;
    },
    readyAsyncComputation: (input, env) => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(input), 100);
        })
    },
    simpleSyncComputation: () => {
        return (input, env) => {
            return input;
        }
    },
    simpleAsyncComputation: () => {
        return (input, env) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(input), 100);
            })
        }
    },
    mockedFunction: jest.fn(() => computationMock),
    mockedFunction2: jest.fn(() => computationMock),
    changeValueFunction: () => {
        return (input, env) => {
            return { ...input, value: input.value + '_123' };
        }
    },
    asyncChangeValueFunction: () => {
        return (input, env) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve({ ...input, value: input.value + '_123' }), 100);
            });
        }
    },
    functionWithParams: jest.fn((data, object) => {
        return (input, env) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve({ ...input, value: input.value + '_' + data + '_' + object.key }), 100);
            });
        }
    }),
    functionWithValidationError: () => {
        return (input, env) => {
            throw new ValidationError('Some validation error!');
        }
    },
    functionWithValidationError2: () => {
        return (input, env) => {
            return Promise.reject(new ValidationError('Some validation error 2!'));
        }
    },
    functionWithBreakPromiseChainError: () => {
        return (input, env) => {
            throw new BreakPromiseChainError();
        }
    },
    functionWithBreakPromiseChainError2: () => {
        return (input, env) => {
            return Promise.reject(new BreakPromiseChainError());
        }
    },
    functionWithError: () => {
        return (input, env) => {
            throw new Error('Some error!');
        }
    },
    functionWithError2: () => {
        return (input, env) => {
            return Promise.reject(new Error('Some error 2!'));
        }
    },
    getObject: () => ({ key: 'value from function' })
};

describe('Tests for the computations handler v2', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    })

    it('The updateState must be passed and must be a callback', () => {
        const fn = () => getHandler({ schema: { _formId_: 'callback' }, computations: generalComputations })
        expect(fn).toThrowError('SectionsComputations: update state callback must be a function.');
    })

    it('The _objectId_ param in the currentSchemaObject must be defined and must be a number', () => {
        const handler = getHandler({ schema: { _formId_: 'object-id-check' }, computations: generalComputations, updateState: () => {}});
        const fn = () => handler({ currentSchemaObject: { }});
        const fn2 = () => handler({ currentSchemaObject: { _objectId_: 'string' }});
        expect(fn).toThrowError('SectionsComputation: _objectId_ must be a number.');
        expect(fn2).toThrowError('SectionsComputation: _objectId_ must be a number.');
    })

    it('The _formId_ param in the full schema must be defined', () => {
        const handler = getHandler({ schema: {}, computations: generalComputations, updateState: () => {}});
        const fn = () => handler({ currentSchemaObject: { _objectId_: 123 }})
        expect(fn).toThrowError('SectionsComputations: formId must be defined.')
    })

    it('Actions must be a non empty array', () => {
        const actions1 = [];
        const actions2 = '$function()';
        const value = { value: '123', dataLink: '@/path/to/value' };
        const currentSchemaObject = { _objectId_: 123 };
        const updateState = () => {};
        const handler = getHandler({ schema: { _formId_: 'actions_non_empty_array' }, computations: generalComputations, updateState });
        const fn1 = () => handler({ value, actions: actions1, currentSchemaObject });
        const fn2 = () => handler({ value, actions: actions2, currentSchemaObject });
        expect(fn1).toThrowError('SectionsComputation: Actions can not be empty.');
        expect(fn2).toThrowError('SectionsComputation: Actions should be an Array.'); 
    })

    // todo: add the value checking...

    it('Sync computation: with set value', async () => {
        // the setValue is necessary to change the context. The setValue writes the input value to the context.
        const actions = [
            "$simpleSyncComputation()",
            "$setValue()"
        ];

        const value = { value: '12345', dataLink: '@/path/to/value' };
        const context = { '@another/value': 'abcd' };
        const currentSchemaObject = { _objectId_: 1 };
        const updateState = jest.fn();
        const handler = getHandler({ schema: { _formId_: 'with-set-value' }, computations: generalComputations, updateState });
        await handler({ value, actions, context, currentSchemaObject });
        const calls = updateState.mock.calls;

        expect(calls.length).toEqual(1);
        expect(calls[0][0]).toEqual(expect.objectContaining({ '@/path/to/value': '12345', '@another/value': 'abcd' }));
        expect(calls[0][0]).not.toBe(context);
    })

    it('Sync computation: without set value', async () => {
        // computations without setValue does not change the context
        const actions = [
            "$simpleSyncComputation()"
        ];

        const value = { value: '12345', dataLink: '@/path/to/value' };
        const context = { '@another/value': 'abcd' };
        const currentSchemaObject = { _objectId_: 2 };
        const updateState = jest.fn();
        const handler = getHandler({ schema: { _formId_: 'without-set-value' }, computations: generalComputations, updateState });
        await handler({ value, actions, context, currentSchemaObject });
        const calls = updateState.mock.calls;

        expect(calls.length).toEqual(1);
        expect(calls[0][0]).toEqual(expect.objectContaining({ '@another/value': 'abcd' }));
        expect(calls[0][0]).not.toBe(context);
    })

    it('Computation call #1', async () => {
        const actions = [
            "$mockedFunction()"
        ];

        const value = { value: 'value', dataLink: 'key' };
        const schema = { _formId_: 'computation-call-#1' };
        const currentSchemaObject = { _objectId_: 3 };
        const handler = getHandler({ schema, computations: generalComputations, updateState: () => {} });
        await handler({ value, actions, currentSchemaObject });

        expect(computationMock.mock.calls.length).toEqual(1);
        expect(generalComputations.mockedFunction.mock.calls.length).toEqual(1);
        expect(computationMock.mock.calls[0][0]).toEqual(value);
    })

    it('Computation call #2: value chaining', async () => {
        const actions = [
            "$mockedFunction()",
            "$changeValueFunction()",
            "$mockedFunction2()"
        ];

        const value = { value: 'value', dataLink: 'key' };
        const schema = { _formId_: 'computation-call-#2' };
        const currentSchemaObject = { _objectId_: 3 };
        const handler = getHandler({ schema, computations: generalComputations, updateState: () => {} });
        await handler({ value, actions, currentSchemaObject });

        expect(computationMock.mock.calls.length).toEqual(2);
        expect(computationMock.mock.calls[0][0]).toEqual(value);
        expect(computationMock.mock.calls[1][0]).toEqual(generalComputations.changeValueFunction()(value));
    })

    it('Computation call #3: value chaining and async function', async () => {
        const actions = [
            "$mockedFunction()",
            "$asyncChangeValueFunction()",
            "$mockedFunction2()"
        ];

        const value = { value: 'value', dataLink: 'key' };
        const schema = { _formId_: 'computation-call-#3' };
        const currentSchemaObject = { _objectId_: 4 };
        const handler = getHandler({ schema, computations: generalComputations, updateState: () => {} });
        await handler({ value, actions, currentSchemaObject });

        expect(computationMock.mock.calls.length).toEqual(2);
        expect(computationMock.mock.calls[0][0]).toEqual(value);
        expect(computationMock.mock.calls[1][0]).toEqual({ ...value, value: value.value + '_123' });
    })

    it('Computation call #4: break computations', async () => {
        const actions = [
            "$mockedFunction()",
            "$asyncChangeValueFunction()",
            "$breakAction()",
            "$mockedFunction2()"
        ];

        const value = { value: 'value', dataLink: 'key' };
        const schema = { _formId_: 'computation-call-#4' };
        const currentSchemaObject = { _objectId_: 5 };
        const handler = getHandler({ schema, computations: generalComputations, updateState: () => {} });
        await handler({ value, actions, currentSchemaObject });

        expect(computationMock.mock.calls.length).toEqual(1);
        expect(computationMock.mock.calls[0][0]).toEqual(value);
        expect(generalComputations.mockedFunction2.mock.calls.length).toEqual(0);
    })

    it('Computation call #6: pass custom params', async () => {
        const actions = [
            "$mockedFunction()",
            "$functionWithParams(@data, $getObject())",
            "$mockedFunction2()",
            "$setValue()"
        ];

        const value = { value: 'value', dataLink: 'dataLinkPath' };
        const schema = { _formId_: 'computation-call-#6' };
        const currentSchemaObject = { _objectId_: 6 };
        const context = { data: 'data from context' };
        const updateState = jest.fn();
        const handler = getHandler({ schema, computations: generalComputations, updateState });
        await handler({ value, actions, context, currentSchemaObject });

        expect(computationMock.mock.calls.length).toEqual(2);
        expect(computationMock.mock.calls[0][0]).toEqual(value);
        expect(computationMock.mock.calls[1][0]).toEqual({ ...value, value: 'value_data from context_value from function' });
        expect(generalComputations.functionWithParams.mock.calls[0][0]).toEqual(context.data);
        expect(generalComputations.functionWithParams.mock.calls[0][1]).toEqual(generalComputations.getObject());
        expect(updateState.mock.calls[0][0]).toEqual(expect.objectContaining({ dataLinkPath: 'value_data from context_value from function', data: 'data from context' }))
    })

    it('Break the previous computation chain for the currentSchemaObject', async () => {
        // if a new computations chain has been started before the previous computations chain is not completed - the previous computation chain is broken.
        const actions = [
            '$delay(4000)',
            '$setValue()'
        ];

        const schema = { _formId_: '#7' };
        const context = { data: 'string' };
        const updateState = jest.fn();
        const handler = getHandler({ schema, computations: generalComputations, updateState });
        let firstCall;
        try {
            firstCall = handler({ value: { dataLink: '@data/link/path/1', value: 'first call' }, actions, context, currentSchemaObject: { _objectId_: 7 } });
            await handler({ value: { dataLink: '@data/link/path/2', value: 'second call' }, actions, context, currentSchemaObject: { _objectId_: 7 } });
        } catch (e) {}
        
        await expect(firstCall).rejects.toThrow(BreakPromiseChainError);
        expect(updateState.mock.calls.length).toEqual(1);
        expect(updateState.mock.calls[0][0]).toEqual(expect.objectContaining({ '@data/link/path/2': 'second call', data: 'string' }));
        expect(updateState.mock.calls[0][0]).toEqual(expect.not.objectContaining({ '@data/link/path/1': 'first call' }));
    })

    it('Await all running computations for the current form', async () => {
        const actions1 = [ '$delay(4000)', '$setValue()' ];
        const actions2 = [ '$setValue()' ];
        const currentSchemaObject1 = { _objectId_: 8 };
        const currentSchemaObject2 = { _objectId_: 7 };
        const value1 = { dataLink: '@data/link/path/1', value: 'first call' };
        const value2 = { dataLink: '@data/link/path/2', value: 'second call' };

        const schema = { _formId_: '#8' };
        const context = { data: 'string' };
        const updateState = jest.fn();
        const handler = getHandler({ schema, computations: generalComputations, updateState });
        let firstCall;
        try {
            firstCall = handler({ value: value1, actions: actions1, context, currentSchemaObject: currentSchemaObject1 });
            await handler({ value: value2, actions: actions2, context, currentSchemaObject: currentSchemaObject2 });
        } catch (e) {}

        await expect(firstCall).rejects.toThrow(BreakPromiseChainError);
        expect(updateState.mock.calls.length).toEqual(1);
        expect(updateState.mock.calls[0][0]).toEqual(expect.objectContaining({ '@data/link/path/2': 'second call', '@data/link/path/1': 'first call', data: 'string' }));
    })

    it('Custom break computations', async () => {
        const actions1 = [
            '$functionWithBreakPromiseChainError()',
            '$mockedFunction()',
            '$setValue()'
        ];
        const actions2 = [
            '$functionWithBreakPromiseChainError2()',
            '$mockedFunction()',
            '$setValue()'
        ];
        const value = { value: 'value', dataLink: '@path/to/data' };
        const currentSchemaObject = { _objectId_: 9 };
        const schema = { _formId_: "custom-break-computations" };

        const handler = getHandler({ schema, computations: generalComputations, updateState });

        await handler({ value, actions: actions1, currentSchemaObject });
        await handler({ value, actions: actions2, currentSchemaObject });

        expect(generalComputations.mockedFunction.mock.calls.length).toEqual(0);
        expect(updateState.mock.calls.length).toEqual(0);
    })

    it('Validation error', async () => {
        const actions1 = [
            '$functionWithValidationError()',
            '$mockedFunction()',
            '$setValue()'
        ];
        const actions2 = [
            '$functionWithValidationError2()',
            '$mockedFunction()',
            '$setValue()'
        ];

        const value = { value: 'value', dataLink: '@path/to/data' };
        const currentSchemaObject = { _objectId_: 10 };
        const schema = { _formId_: "validation-error" };

        const handler = getHandler({ schema, computations: generalComputations, updateState });

        await handler({ value, actions: actions1, currentSchemaObject });
        await handler({ value, actions: actions2, currentSchemaObject });

        expect(generalComputations.mockedFunction.mock.calls.length).toEqual(0);
        expect(updateState.mock.calls.length).toEqual(2);
        expect(updateState.mock.calls[0][0][Symbol.for(currentSchemaObject._objectId_)]).toEqual(
            expect.objectContaining({
                errors: expect.arrayContaining([ 'Some validation error!' ])
            })
        );
        expect(updateState.mock.calls[1][0][Symbol.for(currentSchemaObject._objectId_)]).toEqual(
            expect.objectContaining({
                errors: expect.arrayContaining([ 'Some validation error 2!' ])
            })
        );
    })

    it('Computation based on generator', async () => {
        const actions = [
            '$generatorComputation()',
            '$mockedFunction()',
            '$setValue()'
        ];

        const value = { value: 'value', dataLink: '@path/to/data' };
        const currentSchemaObject = { _objectId_: 12 };
        const schema = { _formId_: "generator-computation" };

        const handler = getHandler({ schema, computations: generalComputations, updateState });
        await handler({ value, actions, currentSchemaObject });

        expect(computationMock.mock.calls.length).toEqual(1);
        expect(computationMock.mock.calls[0][0]).toEqual(expect.objectContaining({
            value: 'firstValueFromGenerator_secondValueFromGenerator'
        }));
        expect(updateState.mock.calls.length).toEqual(1);
        expect(updateState.mock.calls[0][0]).toEqual(expect.objectContaining({
            '@path/to/data': 'firstValueFromGenerator_secondValueFromGenerator'
        }));
    })

    // todo: _onError_ handler tests.
    it('Unexpected error', async () => {
        const actions1 = [
            '$functionWithError()',
            '$mockedFunction()',
            '$setValue()'
        ];
        const actions2 = [
            '$functionWithError2()',
            '$mockedFunction()',
            '$setValue()'
        ];

        const value = { value: 'value', dataLink: '@path/to/data' };
        const currentSchemaObject = { _objectId_: 10 };
        const schema = { _formId_: "validation-error" };

        const handler = getHandler({ schema, computations: generalComputations, updateState });

        await handler({ value, actions: actions1, currentSchemaObject });
        await handler({ value, actions: actions2, currentSchemaObject });

        expect(generalComputations.mockedFunction.mock.calls.length).toEqual(0);
        expect(updateState.mock.calls.length).toEqual(0);
    })

    it('Function return a value without any computation', async () => {
        const actions = [
            '$mockedFunction()',
            '$simpleFunction()', // overrides the initial input value.
            '$mockedFunction()',
            '$setValue()'
        ];

        const value = { value: 'value', dataLink: '@path/to/data' };
        const currentSchemaObject = { _objectId_: 11 };
        const schema = { _formId_: "simple-function" };

        const handler = getHandler({ schema, computations: generalComputations, updateState });
        await handler({ value, actions, currentSchemaObject });

        expect(computationMock.mock.calls[0][0]).toEqual(value);
        expect(computationMock.mock.calls[1][0]).toEqual(generalComputations.simpleFunction());
        expect(updateState.mock.calls[0][0]).toEqual(expect.objectContaining({
            '@simple/function/data/link': 'value from simple function'
        }))
        expect(updateState.mock.calls[0][0]).toEqual(expect.not.objectContaining({
            '@path/to/data': 'value'
        }))
    })
})