import { deepCopy } from '../';

const prototype = Object.create(null, {
    valueInPrototype: {
        value: 'valueInPrototype',
        writable: true,
        enumerable: true,
        configurable: true
    }
});
const definedProperty = {
    value: 'string',
    writable: false,
    enumerable: false,
    configurable: false
};
const definedProperty2 = {
    value: 'string',
    writable: true,
    enumerable: true,
    configurable: true
};

const src = Object.create(prototype, {
    definedProperty,
    definedProperty2
});
src.array = [ 1, 2, 3, 'string' ];
src.array2 = [ { key: 'string' }, { key: { key: 123 } } ];
src.object = { object: { key: 'string', key2: 123 }, array: [ 'string', 123 ] };
src.key = 'string';
src.key2 = 123;
const symbolKey = Symbol('key');
src[symbolKey] = 'symbol';

const copy = deepCopy(src);

describe('Tests for the deep_copy utility', () => {
    it('The copy is equal to the source.', () => {
        expect(copy).toStrictEqual(src);
    })

    it('All objects and arrays reference to another objects in memory', () => {
        expect(copy).not.toBe(src);
        expect(copy.array).not.toBe(src.array);
        expect(copy.array2).not.toBe(src.array2);
        expect(copy.object).not.toBe(src.object);
        expect(copy.object.object).not.toBe(src.object.object);
    })

    it('Symbol keys are copied', () => {
        expect(copy[symbolKey]).toEqual(src[symbolKey]);
    })

    it('The source and copy objects have the same prototype', () => {
        const copyProto = Object.getPrototypeOf(copy);
        const srcProto = Object.getPrototypeOf(src);
        expect(copyProto).toBe(srcProto);
        expect(copyProto.valueInPrototype).toBe('valueInPrototype');
    })

    it('Property descriptions are saved', () => {
        expect(Object.getOwnPropertyDescriptor(copy, 'definedProperty')).toStrictEqual(definedProperty);
        expect(Object.getOwnPropertyDescriptor(copy, 'definedProperty2')).toStrictEqual(definedProperty2);
    })

    it('Only arrays and plain objects are processed', () => {
        const date = new Date();
        const copy = deepCopy(date);
        expect(date).toBe(copy);
    })
})