import ValidationError from '../errors/validation_error';
import { isEmpty, isError } from '../../../utils';
import BreakPromiseChainError from '../errors/break_promise_chain_error';
import { deepCopy } from '../../../utils/deep_copy';
import { isObject } from '../../../data_link_parser/utils';
import { asyncDataParser, MODE } from '../../../data_parser/v5';
import { runAsyncGenerator } from '../../../data_parser/utils';
import { awaitAll } from '../utils';

/**
 * This object contains promises that are related with forms according the _formId_.
 * @type {{}}
 */
const formPromises = {};

/**
 * Returns a setState processor that works with computations actions.
 * This processor builds a promises chain from the passed actions list.
 * This processor breaks the previous computations chain for the current field if it is not finished yet.
 * @param {Object} context
 * @param {Object} schema - full schema
 * @param {Object} computations - collections of functions
 * @param {function} updateState
 * @returns {Function}
 */
export const getHandler = ({ schema, computations, updateState }) => {
    // todo: maybe _formId_ value should be based on schema name.
    const { _formId_ } = schema;
    if (typeof updateState !== 'function') throw new Error('SectionsComputations: update state callback must be a function.');
    return ({ value, actions, after, context, currentSchemaObject, match, location }) => {
        let { _objectId_ } = currentSchemaObject;
        _objectId_ = Number(_objectId_);
        if (Number.isNaN(_objectId_)) throw new Error('SectionsComputation: _objectId_ must be a number.');
        if (typeof _formId_ === 'undefined' || !_formId_) throw new Error('SectionsComputations: formId must be defined.');

        if (!formPromises.hasOwnProperty(_formId_)) {
            formPromises[_formId_] = {
                mainReject: null,
                newContext: deepCopy(context),
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
                    else console.error('[error] computations: ', err);
                }
            )
            .then(
                () => {
                    // runs the "after actions"
                    // after chains should not affect the context.
                    // after chains is intended only for service operations (resize iframe, send request...).
                    const chains = {};
                    if (isEmpty(afterActions)) return;
                    const ids = Object.getOwnPropertyNames(afterActions);
                    for (const id of ids) {
                        const { actions, value, currentSchemaObject } = afterActions[id];
                        chains[id] = run(false, actions, value, currentSchemaObject, newContext, schema, computations);
                    }
                    const { promise } = awaitAll(chains);
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
 * @param controlStatus
 * @param actionsList
 * @param value
 * @param currentSchemaObject
 * @param context
 * @param schema
 * @param otherParams
 * @returns {Promise<*>}
 */
function run (controlStatus, actionsList, value, currentSchemaObject, context, schema, ...otherParams) {
    return new Promise((resolve, reject) => {
        const { _formId_ } = schema;
        const { _objectId_ } = currentSchemaObject;
        const { breakControls = null } = formPromises[_formId_] || {};
        if (controlStatus && !breakControls) {
            throw new Error('[error] breakControls is not defined.');
        }

        const g = actionsIterator(actionsList, value, currentSchemaObject, context, schema, ...otherParams);

        let breakMark = false;
        const stop = (err) => {
            try {
                const { done } = g.throw(err);
                if (!done) {
                    reject(err);
                    breakMark = true;
                }
                controlStatus && delete breakControls[_objectId_];
            } catch (e) {
                reject(e);
            }
        };
        controlStatus && (breakControls[_objectId_] = stop);

        const next = (v) => {
            try {
                if (breakMark) return;
                const item = g.next(v);
                const { value, done } = item;
                if (done) resolve(value);
                else value.then(next, reject);
            } catch (e) {
                reject(e);
            }
        };

        next();
    });
}

/**
 * Iterates the passed actions list.
 * @param actionsList
 * @param value
 * @param otherParams
 * @returns {Generator<Promise<never>|Promise|Promise<*>|*, void, *>}
 */
function* actionsIterator (actionsList, value, ...otherParams) {
    try {
        for (const act of actionsList) {
            value = yield compute(act, value, ...otherParams);
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
 * @param {*} act - In most cases, this is a reference to a function.
 * @param {Object} value
 * @param {Object} currentSchemaObject
 * @param {Object} context
 * @param {Object} schema
 * @param {Object} computations
 * @param match
 * @param location
 * @param {function} updateState
 * @returns {Promise<never>|Promise|Promise<unknown>}
 */
const compute = (act, value, currentSchemaObject, context, schema, computations, match, location, updateState) => {
    return new Promise((resolve, reject) => {
        const finalResolve = (val) => {
            if (!isObject(val)) {
                reject(new Error('Computation must return an object.'));
                return;
            }
            val = { ...value, ...val };
            if (!val.hasOwnProperty('value') || !val.hasOwnProperty('dataLink')) {
                reject(new Error('Returned object must contain "value" and "dataLink" properties.'));
            } else resolve(val);
        };
        asyncDataParser({ schema: act, functions: computations, data: context, rootData: context, mode: MODE.USER_DEEP })
            .then((act) => {
                if (typeof act === 'function') {
                    const res = act(value, { context, schema, currentSchemaObject, match, location, computations, updateState });
                    if (act.isGenerator()) {
                        runAsyncGenerator(res, finalResolve, reject);
                    } else if (res instanceof Promise) {
                        res.then(finalResolve, reject);
                    } else {
                        finalResolve(res);
                    }
                } else if (act instanceof Promise) {
                    act.then(finalResolve, reject);
                } else {
                    finalResolve(act);
                }
            })
            .catch(reject);
    });
};

/**
 * Writes an error messages array to the passed schema object.
 * @param {Object} error
 * @param {Object} schema
 * @param {Proxy} context - Proxy wrapped context.
 * @returns {*}
 */
const writeErrors = (error, schema, context) => {
    const { _objectId_ } = schema;
    const serviceKey = Symbol.for(_objectId_);
    const serviceObject = context[serviceKey] || {};
    if (isError(error)) {
        context[serviceKey] = { ...serviceObject, errors: [ error.message ] };
        return undefined;
    }
    console.warn('[debug] error', Object.prototype.toString.call(error));
    console.error('Unhandled error! Error object must be instance of the Error.');
    console.error(error);
};

/**
 * Removes an error messages array from the corresponding service object in the context.
 * @param {Object} schema
 * @param {Proxy} context
 */
const clearErrors = (schema, context) => {
    const { _objectId_ } = schema;
    const serviceKey = Symbol.for(_objectId_);
    const serviceObject = context[serviceKey] || {};
    if ('errors' in serviceObject) delete serviceObject.errors;
    context[serviceKey] = { ...serviceObject };
};
