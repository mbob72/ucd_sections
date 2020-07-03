/* eslint-disable @typescript-eslint/no-explicit-any */
// experimental functions

import { ComputationsInterfaces as CI } from '../../types/types';

/* demo - start */
/**
 * Generator might be returned
 */
export const generatorComputation: CI.SchemaCallbackForComputations = () => {
    return function* (input: CI.ComputationValue): Generator<any, CI.ComputationValue, any> {
        const value = yield Promise.resolve('firstValueFromGenerator');
        const value2 = yield new Promise((resolve) => {
            setTimeout(() => resolve(value + '_secondValueFromGenerator'), 4000);
        });
        return { ...input, value: value2 };
    };
};

export const generatorComputation2: CI.SchemaCallbackForComputations = () => {
    return function* (input: CI.ComputationValue): Generator<any, Promise<CI.ComputationValue>, any> {
        const value: string = yield Promise.resolve('value');
        return new Promise<CI.ComputationValue>((resolve) => {
            setTimeout(
                () => resolve(<CI.ComputationValue>{ ...input, value: value + '_value2' }),
                10000
            );
        });
    };
};
/* demo - end */
