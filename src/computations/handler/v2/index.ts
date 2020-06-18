/* eslint-disable @typescript-eslint/no-explicit-any */
import ValidationError from '../errors/validation_error';
import { isEmpty, isError, hasOwnProperty } from '../../../utils';
import BreakPromiseChainError from '../errors/break_promise_chain_error';
import { deepCopy } from '../../../utils/deep_copy';
import { isObject } from '../../../data_link_parser/utils';
import { asyncDataParser } from '../../../data_parser/v5';
import { runAsyncGenerator } from '../../../data_parser/utils';
import { awaitAll } from '../utils';
import { DataContext, SchemaCallbackCollection, SectionInterfaces, ComputationsInterfaces, DataParserInterfaces, SchemaCallbackList } from 'types/types';
import SectionV4 = SectionInterfaces.v4;
import CI = ComputationsInterfaces

/**
 * This object contains promises that are related with forms according the _formId_.
 */
const formPromises: Record<string, CI.FormPromiseData> = {};

/**
 * Returns a setState processor that works with computations actions.
 * This processor builds a promises chain from the passed actions list.
 * This processor breaks the previous computations chain for the current field if it is not finished yet.
 */
export const getHandler = ({ schema, computations, updateState }: { schema: Record<string, any>, computations: SchemaCallbackCollection, updateState: (data: DataContext) => void }): SectionV4.updateStateCallback => {
    // todo: maybe _formId_ value should be based on schema name.
    const { _formId_ } = schema;
    if (typeof updateState !== 'function') throw new Error('SectionsComputations: update state callback must be a function.');
    return ({ value, actions, after, context, currentSchemaObject, match, location }: SectionV4.UpdateStateCallbackParam) => {
        let { _objectId_ } = currentSchemaObject;
        _objectId_ = Number(_objectId_);
        if (Number.isNaN(_objectId_)) throw new Error('SectionsComputation: _objectId_ must be a number.');
        if (typeof _formId_ === 'undefined' || !_formId_) throw new Error('SectionsComputations: formId must be defined.');

        if (!hasOwnProperty(formPromises, _formId_)) {
            formPromises[_formId_] = {
                mainReject: void 0,
                newContext: context ? deepCopy(context) : {},
                computeChains: {},
                afterActions: {},
                breakControls: {}
            };
        }

        const { mainReject, newContext, breakControls, computeChains, afterActions } = formPromises[_formId_];
        if (typeof mainReject === 'function') {
            // Breaks awaiting for all promise chains for the current form.
            mainReject(new BreakPromiseChainError());
        }

        if (typeof breakControls[_objectId_] === 'function') {
            // Breaks the previous promise chain for the current field.
            breakControls[_objectId_](new BreakPromiseChainError());
            delete computeChains[_objectId_];
        }

        if (!Array.isArray(actions)) throw new Error('SectionsComputation: Actions should be an Array.');
        if (!actions.length) throw new Error('SectionsComputation: Actions can not be empty.');
        const process = run(true, actions, value, currentSchemaObject, newContext, schema, computations, match, location, updateState);
        process
            .then(() => clearErrors(currentSchemaObject, newContext))
            .catch((error) => {
                if (error instanceof ValidationError) {
                    writeErrors(error, currentSchemaObject, newContext);
                    console.error('There are errors in the form!');
                } else throw error;
            })
            .then(() => clearErrors(schema, newContext))
            .catch((error) => {
                if (error instanceof Error && !(error instanceof BreakPromiseChainError)) {
                    writeErrors(error, schema, newContext);
                    console.error(error);
                }
            });

        computeChains[_objectId_] = process;
        const allChains = Object.values(computeChains);
        const { rejectCallback, promise } = awaitAll(allChains);
        formPromises[_formId_].mainReject = rejectCallback;
        if (Array.isArray(after) && after.length) {
            afterActions[_objectId_] = {
                actions: after,
                value,
                currentSchemaObject
            };
        }

        promise
            .then(
                (results) => {
                    const status = results.reduce((acc, { status }) => {
                        return acc || status === 'success';
                    }, false);
                    if (status) updateState(newContext);
                    delete formPromises[_formId_];
                },
                (err) => {
                    if (err instanceof BreakPromiseChainError) throw err;
                    else {
                        console.error('[error] computations: ', err, err instanceof BreakPromiseChainError);
                    }
                }
            )
            .then(
                () => {
                    // todo: after actions should be processed by the same way as main computations chain.
                    // runs the "after actions"
                    // after chains should not affect the context.
                    // after chains is intended only for service operations (resize iframe, send request...).
                    const chains: Record<string, Promise<any>> = {};
                    if (isEmpty(afterActions)) return;
                    const ids = Object.getOwnPropertyNames(afterActions);
                    for (const id of ids) {
                        const { actions, value, currentSchemaObject } = afterActions[id];
                        chains[id] = run(false, actions, value, currentSchemaObject, newContext, schema, computations);
                    }
                    const { promise } = awaitAll(Object.values(chains));
                    return promise;
                },
                (err) => {
                    if (err instanceof BreakPromiseChainError) return null;
                }
            )
            .catch((error) => {
                console.error('[error] afterComputations: ', error);
            });
    };
};

/**
 * Computations beginning.
 */
function run (
    controlStatus: boolean,
    actionsList: SchemaCallbackList,
    value: CI.ComputationValue,
    currentSchemaObject: Record<string, any>,
    context: DataContext,
    schema: Record<string, any>,
    computations: SchemaCallbackCollection,
    match?: any,
    location?: any,
    updateState?: (data: DataContext) => void
): Promise<CI.ComputationValue> {
    return new Promise((resolve, reject) => {
        const { _formId_ } = schema;
        const { _objectId_ } = currentSchemaObject;
        const { breakControls = null } = formPromises[_formId_] || {};
        if (controlStatus && !breakControls) {
            throw new Error('[error] breakControls is not defined.');
        }

        const g = actionsIterator(actionsList, value, currentSchemaObject, context, schema, computations, match, location, updateState);

        let breakMark = false;
        const stop = (err: Error): void => {
            try {
                const { done } = g.throw(err);
                if (!done) {
                    reject(err);
                    breakMark = true;
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                if (controlStatus && breakControls && breakControls[_objectId_]) delete breakControls[_objectId_];
            } catch (e) {
                reject(e);
            }
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        if (controlStatus && breakControls && breakControls[_objectId_]) breakControls[_objectId_] = stop;

        const next = (v?: CI.ComputationValue): void => {
            try {
                if (breakMark) return;
                const item = g.next(<CI.ComputationValue>v);
                const { value, done } = item;
                if (done) resolve(<CI.ComputationValue>value);
                else (<Promise<CI.ComputationValue>>value).then(next, reject);
            } catch (e) {
                reject(e);
            }
        };

        next();
    });
}

/**
 * Iterates the passed actions list.
 */
function* actionsIterator (
    actionsList: SchemaCallbackList,
    value: CI.ComputationValue,
    currentSchemaObject: Record<string, any>,
    context: DataContext,
    schema: Record<string, any>,
    computations: SchemaCallbackCollection,
    match?: any,
    location?: any,
    updateState?: any
): Generator<Promise<CI.ComputationValue>, CI.ComputationValue | undefined | void | never, CI.ComputationValue> {
    try {
        for (const act of actionsList) {
            value = yield compute(<CI.SchemaCallbackForComputations | string | Record<string, any>>act, value, currentSchemaObject, context, schema, computations, match, location, updateState);
        }
        return value;
    } catch (e) {
        if (e instanceof BreakPromiseChainError) {
            console.warn('[debug] actionsIterator has been stopped.');
        } else throw e;
    }
}

/**
 * Calls the current function in the promise chain,
 * if some dataLink in the additional params has been passed - the dataLinkParser parses it.
 * This processor always returns a Promise,
 * if the called function returns a not Promise object, it is resolved "as is",
 * if the called function returns a Promise - we wait until the promise's state is changed and process it.
 * In this function, we register a reject function to take the possibility to break the current promise chain.
 */
const compute = (
    act: CI.SchemaCallbackForComputations | string | Record<string, any>,
    value: CI.ComputationValue,
    currentSchemaObject: Record<string, any>,
    context: DataContext,
    schema: Record<string, any>,
    computations: SchemaCallbackCollection,
    match?: any,
    location?: any,
    updateState?: any
): Promise<CI.ComputationValue> => {
    return new Promise((resolve, reject) => {
        const finalResolve = (val: CI.ComputationValue) => {
            if (!isObject(val)) {
                reject(new Error('Computation must return an object.'));
                return;
            }
            val = { ...value, ...val };
            if (!hasOwnProperty(val, 'value') || !hasOwnProperty(val, 'dataLink')) {
                reject(new Error('Returned object must contain "value" and "dataLink" properties.'));
            } else resolve(val);
        };
        asyncDataParser(<DataParserInterfaces.v5.EntryParams>{ schema: act, functions: computations, data: context, rootData: context, defaultData: null, tokens: {} })
            .then((act) => {
                if (typeof act === 'function') {
                    Promise
                        .resolve(act(value, { context, schema, currentSchemaObject, match, location, computations, updateState }))
                        .then((res) => {
                            if (act.isGenerator()) runAsyncGenerator(res, finalResolve, reject);
                            else finalResolve(res);
                        })
                        .catch(reject);
                } else finalResolve(act);
            })
            .catch(reject);
    });
};

/**
 * Writes an error messages array to the passed schema object.
 */
const writeErrors = (error: Error, schema: Record<string, any>, context: DataContext): void => {
    const { _objectId_ } = schema;
    const serviceKey = Symbol.for(_objectId_);
    const serviceObject = context ? context[serviceKey] ?? {} : {};
    if (isError(error) && context) {
        context[serviceKey] = { ...serviceObject, errors: [ error.message ] };
        return;
    }
    console.warn('[debug] error', Object.prototype.toString.call(error));
    console.error('Unhandled error! Error object must be instance of the Error.');
    console.error(error);
};

/**
 * Removes an error messages array from the corresponding service object in the context.
 */
const clearErrors = (schema: Record<string, any>, context: DataContext): void => {
    const { _objectId_ } = schema;
    const serviceKey = Symbol.for(_objectId_);
    const serviceObject = context ? context[serviceKey] ?? {} : {};
    if ('errors' in serviceObject) delete serviceObject.errors;
    if (context) context[serviceKey] = { ...serviceObject };
};
