import { ProcessedObject, Primitives } from './types';
import { ExtendedPropertyDescriptorMap } from 'types/types';

let emptyArrayFlag = false;
type Value = ProcessedObject | Primitives | unknown
interface CopyCallback {
    (object: ProcessedObject): ProcessedObject;
}

/**
 * Is duplicated for stringify possibility.
 * @param value
 * @returns {boolean}
 */
const isObject = (value: unknown): boolean =>
    Object.prototype.toString.call(value) === '[object Object]';

/**
 * Slow and flexible deep copier.
 */
const deepCopy = (data: ProcessedObject): ProcessedObject => {
    if (isObject(data)) {
        const props: ExtendedPropertyDescriptorMap = Object.getOwnPropertyDescriptors(data);
        for (const i of Object.getOwnPropertyNames(props)) {
            if (!Object.prototype.hasOwnProperty.call(props, i)) continue;
            props[i].value = getValue(props[i].value);
        }
        for (const i of Object.getOwnPropertySymbols(props)) {
            if (!Object.prototype.hasOwnProperty.call(props, i)) continue;
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

// todo: 1) add a processing the next types of object: regexp, date, map, set, function, generator and boxed primitives.
// todo: 2) add symbol keys processing.
/**
 * This method returns a constructor that can be used to copy objects that have the same structure as the structure of the source object.
 * The given constructor is very fast but is not efficient on irregular structured objects in arrays and empty arrays that could be filled later.
 * @param {Object} source
 * @returns {Function}
 * @example
 *   let Copy = getDeepCopyConstructor(source); // should be created only at once
 *   let deepCopiedObject = new Copy(sourceOrSourceSimilarObject); // should be used many times
 */
const getDeepCopyConstructor = (source: ProcessedObject): CopyCallback => {
    if (!isObject(source))
        throw new Error('DeepCopy: the source should be an object!');
    const constructorBody = getConstructorBody(source);
    if (emptyArrayFlag) {
        constructorBody.push(
            isObject.toString(),
            getValue.toString(),
            deepCopy.toString()
        );
    }
    // eslint-disable-next-line no-new-func
    return <CopyCallback>(new Function('source', constructorBody.join('')));
};

const getConstructorBody = ( source: ProcessedObject, path = '', constructorBody: Array<string> = [], arrayLevel = 0): Array<string> => {
    if (!path && !isObject(source)) {
        throw new Error('DeepCopy: The root should be an object!');
    }

    if (!path) {
        constructorBody.push(
            'if',
            '(',
            '!new.target',
            ')',
            'throw new Error("DeepCopy must be invoked with the \'new\' operator!")',
            ';'
        );
        emptyArrayFlag = false;
    }

    if (Array.isArray(source)) {
        if (!source.length) {
            emptyArrayFlag = true;
            constructorBody.push(
                'this',
                '.',
                path,
                '=',
                'deepCopy',
                '(',
                'source',
                '.',
                path,
                ')',
                ';'
            );
            return constructorBody;
        }
        arrayLevel++;
        constructorBody.push('this', '.', path, '=', '[', ']', ';');
        constructorBody.push(
            'for',
            '(',
            'let ',
            'i',
            String(arrayLevel),
            '=',
            '0',
            ';',
            'i',
            String(arrayLevel),
            '<',
            'source',
            '.',
            path,
            '.',
            'length',
            ';',
            'i',
            String(arrayLevel),
            '++',
            ')',
            '{'
        );
        // An array with identical structured objects is expected,
        // so that we use only the first object for body generation.
        getConstructorBody(
            <ProcessedObject> source[0],
            path + '[' + 'i' + arrayLevel + ']',
            constructorBody,
            arrayLevel
        );
        constructorBody.push('}');
    } else if (isObject(source)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        path && constructorBody.push('this', '.', path, '=', '{', '}', ';');
        for (const key in source) {
            if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
            if (isObject(source[key]) || Array.isArray(source[key])) {
                const newKey = path ? path + '.' + key : key;
                getConstructorBody(source[key], newKey, constructorBody, arrayLevel);
            } else {
                constructorBody.push('this');
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                path && constructorBody.push('.', path);
                constructorBody.push('.', key, '=', 'source');
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                path && constructorBody.push('.', path);
                constructorBody.push('.', key, ';');
            }
        }
    } else {
    // from array processing
        constructorBody.push('this', '.', path, '=', 'source', '.', path, ';');
    }

    return constructorBody;
};

export { deepCopy, getDeepCopyConstructor };
