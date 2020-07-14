import { isEqual, and, or, not, ifCondition, orValue, andValue, toNumber, toMoneyFormat, toBoolean, isInRange, firstLetterUpperCase, toUpperCase, underScoreToCamelCase, toLowerCase } from '../functions';
import { isConstructorDeclaration } from 'typescript';

describe('Tests for built in simple functions', () => {

    beforeEach(() => {
        console.warn = jest.fn();
        console.error = jest.fn();
    })

    it('isEqual', () => {
        expect(isEqual(1, 1)).toBeTruthy();
        expect(isEqual('string', 'string')).toBeTruthy();
        const object = Object.create(null);
        expect(isEqual(object, object)).toBeTruthy();
        expect(isEqual(null, null)).toBeTruthy();
        expect(isEqual(void 0, void 0)).toBeTruthy();
        expect(isEqual(true, true)).toBeTruthy();
        expect(isEqual(false, false)).toBeTruthy();
        expect(isEqual(false, Boolean(''))).toBeTruthy();
        expect(isEqual(Number('1'), 1)).toBeTruthy();
        expect(isEqual(NaN, NaN)).toBeTruthy();
        expect(isEqual('string', 'strin')).toBeFalsy();
        expect(isEqual('1', 1)).toBeFalsy();
        expect(isEqual('', false)).toBeFalsy();
        expect(isEqual(0, false)).toBeFalsy();
        expect(isEqual(1, true)).toBeFalsy();
        expect(isEqual('1', true)).toBeFalsy();
        expect(isEqual([], true)).toBeFalsy();
        expect(isEqual({}, true)).toBeFalsy();
        expect(isEqual([], false)).toBeFalsy();
        expect(isEqual({}, false)).toBeFalsy();
        expect(isEqual({}, {})).toBeFalsy();
        expect(isEqual(0, -0)).toBeTruthy();
    })

    it('and', () => {
        expect(and(true)).toBeTruthy();
        expect(and(true, true)).toBeTruthy();
        expect(and(true, true, true, true, true)).toBeTruthy();
        expect(and({}, true)).toBeTruthy();
        expect(and({}, [])).toBeTruthy();
        expect(and({}, 'string')).toBeTruthy();
        expect(and({}, -1)).toBeTruthy();

        expect(and(false)).toBeFalsy();
        expect(and(true, true, false, true, true)).toBeFalsy();
        expect(and(NaN, true)).toBeFalsy();
        expect(and(null, true)).toBeFalsy();
        expect(and(void 0, true)).toBeFalsy();
        expect(and(0, true)).toBeFalsy();
        expect(and(-0, true)).toBeFalsy();
        expect(and('', true)).toBeFalsy();
    })

    it('or', () => {
        expect(or(true)).toBeTruthy();
        expect(or(true, false)).toBeTruthy();
        expect(or(false, true)).toBeTruthy();
        expect(or(false, [])).toBeTruthy();
        expect(or(false, {})).toBeTruthy();
        expect(or(false, 1)).toBeTruthy();
        expect(or(false, '1')).toBeTruthy();
        expect(or(false, false)).toBeFalsy();
        expect(or(null, void 0, NaN, 0, '', -0, false)).toBeFalsy();
    })

    it('not', () => {
        expect(not(0)).toBeTruthy();
        expect(not(-0)).toBeTruthy();
        expect(not(null)).toBeTruthy();
        expect(not(NaN)).toBeTruthy();
        expect(not(void 0)).toBeTruthy();
        expect(not('')).toBeTruthy();
        expect(not(false)).toBeTruthy();

        expect(not(1)).toBeFalsy();
        expect(not([])).toBeFalsy();
        expect(not({})).toBeFalsy();
        expect(not(-1)).toBeFalsy();
        expect(not('q')).toBeFalsy();
        expect(not(true)).toBeFalsy();
    })

    it('ifCondition', () => {
        expect(ifCondition(true, 1, 2)).toEqual(1)
        expect(ifCondition(1, 1, 2)).toEqual(1)
        expect(ifCondition('1', 1, 2)).toEqual(1)
        expect(ifCondition({}, 1, 2)).toEqual(1)
        expect(ifCondition([], 1, 2)).toEqual(1)
        expect(ifCondition(-1, 1, 2)).toEqual(1)

        expect(ifCondition(false, 1, 2)).toEqual(2)
        expect(ifCondition(0, 1, 2)).toEqual(2)
        expect(ifCondition(-0, 1, 2)).toEqual(2)
        expect(ifCondition(null, 1, 2)).toEqual(2)
        expect(ifCondition(void 0, 1, 2)).toEqual(2)
        expect(ifCondition(NaN, 1, 2)).toEqual(2)
        expect(ifCondition('', 1, 2)).toEqual(2)
    })

    it('orValue', () => {
        expect(orValue(1)).toEqual(1)
        expect(orValue(0, 1)).toEqual(1)
        expect(orValue(1, 0)).toEqual(1)
        expect(orValue(1, 0, 123)).toEqual(1)
        expect(orValue(null, void 0, NaN, '', false, 0, -0, 1, 123)).toEqual(1)
        expect(orValue(null, void 0, NaN, '', false, 0, -0)).toEqual(-0) 
    })

    it('andValue', () => {
        expect(andValue(1)).toEqual(1);
        expect(andValue(1, 2)).toEqual(2);
        expect(andValue(1, 2, 3)).toEqual(3);
        expect(andValue(1, 2, 3)).toEqual(3);
        expect(andValue(1, 2, '')).toEqual('');
        expect(andValue(1, 2, '', 3)).toEqual('');
        expect(andValue(1, 2, 0, 3)).toEqual(0);
        expect(andValue(1, 2, -0, 3)).toEqual(-0);
        expect(andValue(1, 2, null, 3)).toEqual(null);
        expect(andValue(1, 2, void 0, 3)).toEqual(void 0);
        expect(andValue(1, 2, NaN, 3)).toEqual(NaN);
        expect(andValue(1, 2, false, 3)).toEqual(false);
    })

    it('toNumber', () => {
        console.error = jest.fn();
        expect(toNumber('1')).toEqual(1);
        expect(toNumber(true)).toEqual(1);
        expect(toNumber('123')).toEqual(123);
        expect(toNumber('12.3')).toEqual(12.3);
        expect(toNumber('12.00')).toEqual(12);
        expect(toNumber('123e-1')).toEqual(12.3)
        expect(toNumber('')).toEqual(0);
        expect(toNumber(null)).toEqual(0);
        expect(toNumber('0x11')).toEqual(17);
        expect(toNumber('0b11')).toEqual(3);
        expect(toNumber('0o11')).toEqual(9);
        expect(toNumber('foo')).toEqual(0);
        expect(toNumber('100a')).toEqual(0);
        expect(toNumber('-Infinity')).toEqual(Number.NEGATIVE_INFINITY);
        expect(console.error.mock.calls.length).toEqual(2);
    })

    it('toMoneyFormat', () => {
        expect(toMoneyFormat(123)).toEqual('123.00');
        expect(toMoneyFormat(123.125)).toEqual('123.13');
        expect(toMoneyFormat(123.124)).toEqual('123.12');
    })

    it('toBoolean', () => {
        expect(toBoolean(0)).toBeFalsy();
        expect(toBoolean(-0)).toBeFalsy();
        expect(toBoolean(null)).toBeFalsy();
        expect(toBoolean(void 0)).toBeFalsy();
        expect(toBoolean('')).toBeFalsy();
        expect(toBoolean(NaN)).toBeFalsy();
        expect(toBoolean(false)).toBeFalsy();

        expect(toBoolean([])).toBeTruthy();
        expect(toBoolean({})).toBeTruthy();
        expect(toBoolean(1)).toBeTruthy();
        expect(toBoolean(-1)).toBeTruthy();
        expect(toBoolean('234')).toBeTruthy();
        expect(toBoolean(true)).toBeTruthy();
    })

    it('isInRange', () => {
        expect(isInRange({ range: { min: 1, max: 10 } }, 5)).toBeTruthy();
        expect(isInRange({ range: { min: 1, max: 10 } }, 10)).toBeTruthy();
        expect(isInRange({ range: { min: 1, max: 10 } }, 1)).toBeTruthy();
        expect(isInRange({ range: { min: '1', max: '10' } }, '1')).toBeTruthy();
        expect(isInRange({ range: { min: 1, max: 10 } }, 11)).toBeFalsy();
        expect(isInRange({ range: { min: 'a', max: 10 } }, 11)).toBeFalsy();
        expect(isInRange({ range: { min: 1, max: 'b' } }, 11)).toBeFalsy();
        expect(isInRange({ range: { min: 1, max: 10 } }, 'c')).toBeFalsy();
        expect(console.error.mock.calls.length).toEqual(3);
    })

    it('firstLetterUpperCase', () => {
        expect(firstLetterUpperCase('string')).toEqual('String');
        expect(firstLetterUpperCase('sTRING')).toEqual('String');
        expect(firstLetterUpperCase(123)).toEqual(123);
        expect(console.error.mock.calls.length).toEqual(1);
    })

    it('toUpperCase', () => {
        expect(toUpperCase('string')).toEqual('STRING');
        expect(toUpperCase(123)).toEqual(123);
        expect(console.error.mock.calls.length).toEqual(1);
    })

    it('underscoreToCamelCase', () => {
        expect(underScoreToCamelCase('camel_case_string')).toEqual('CamelCaseString');
        expect(underScoreToCamelCase('camel_cASE_string')).toEqual('CamelCaseString');
        expect(underScoreToCamelCase(123)).toEqual(123);
        expect(console.error.mock.calls.length).toEqual(1);
    })

    it('toLowerCase', () => {
        expect(toLowerCase('STRING')).toEqual('string');
        expect(toLowerCase(123)).toEqual(123);
        expect(console.error.mock.calls.length).toEqual(1);
    })
})