import { ProcessedObject, Primitives } from './types';
import { ExtendedPropertyDescriptorMap } from '../../types/types';
import { strictlyIsObject as isObject } from './utils';

type Value = ProcessedObject | Primitives | unknown

const deepCopy = (data: ProcessedObject): ProcessedObject => {
    if (isObject(data)) {
        const props: ExtendedPropertyDescriptorMap = Object.getOwnPropertyDescriptors(data);
        for (const i of Object.getOwnPropertyNames(props)) {
            props[i].value = getValue(props[i].value);
        }
        for (const i of Object.getOwnPropertySymbols(props)) {
            props[i].value = getValue(props[i].value);
        }
        return Object.create(Object.getPrototypeOf(data), props);
    }
    if (Array.isArray(data)) {
        const clone: Array<Value> = [];
        for (const i of data) {
            clone.push(getValue(i));
        }
        return clone;
    }
    console.warn('[warning] deepCopy: an array or an object must be passed for processing.');
    return data;
};

const getValue = (value: Value): Value => {
    if (isObject(value) || Array.isArray(value)) {
        return deepCopy(<ProcessedObject>value);
    } else {
        return value;
    }
};



export { deepCopy };
