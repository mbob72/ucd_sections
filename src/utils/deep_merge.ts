import { deepCopy } from './deep_copy';
import { ExtendedPropertyDescriptorMap } from '../../types/types';
import { ProcessedObject } from './types';

const isObject = (value: unknown): boolean =>
    Object.prototype.toString.call(value) === '[object Object]';

const isArrayOrObject = (value: unknown): boolean =>
    isObject(value) || Array.isArray(value);

const getValue = (value: unknown): unknown =>
    isArrayOrObject(value) ? deepCopy(<ProcessedObject>value) : value;

const getMergedDescriptors = (destProps: ExtendedPropertyDescriptorMap, sourceProps: ExtendedPropertyDescriptorMap, sourceKeys: Array<string> | Array<symbol>) => {
    for (const sourceKey of sourceKeys) {
        if (!Object.prototype.hasOwnProperty.call(sourceProps, sourceKey)) continue;
        if (!destProps[sourceKey]) {
            destProps[sourceKey] = {
                ...sourceProps[sourceKey],
                value: getValue(sourceProps[sourceKey].value),
            };
        } else {
            let newValue: unknown;
            if (
                !isArrayOrObject(destProps[sourceKey].value) &&
                !isArrayOrObject(sourceProps[sourceKey].value)
            ) {
                newValue = sourceProps[sourceKey].value;
            } else {
                newValue = deepMerge(
                    destProps[sourceKey].value,
                    sourceProps[sourceKey].value
                );
            }
            destProps[sourceKey] = {
                ...sourceProps[sourceKey],
                value: newValue,
            };
        }
    }
    return destProps;
};

const deepMerge = (dest: ProcessedObject, source: ProcessedObject): ProcessedObject => {
    if (isObject(dest) && isObject(source)) {
        const sourceProps = Object.getOwnPropertyDescriptors(source);
        const destProps = Object.getOwnPropertyDescriptors(dest);
        getMergedDescriptors(
            destProps,
            sourceProps,
            Object.getOwnPropertyNames(sourceProps)
        );
        getMergedDescriptors(
            destProps,
            sourceProps,
            Object.getOwnPropertySymbols(sourceProps)
        );
        return Object.create({}, destProps);
    } else if (Array.isArray(dest) && Array.isArray(source)) {
        const newArray: Array<unknown> = [];
        for (const i of dest) newArray.push(getValue(i));
        for (const i of source) newArray.push(getValue(i));
        return newArray;
    } else {
        throw new Error(
            `[error] deepMerge: destination object and source object must be arrays or objects and the same type.
A ${Object.prototype.toString.call(dest)} of the destination object and a ${Object.prototype.toString.call(source)} of the source object are given.`
        );
    }
};

export default deepMerge;
