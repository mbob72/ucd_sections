/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComputationsInterfaces as CI } from '../../types/types';

/** truth if the passed values are strictly equal */
export const isEqual: CI.SchemaCallbackSimple = (value: any, control: any): boolean => {
    return value === control;
};

/** truth if all values are truth */
export const and: CI.SchemaCallbackSimple = (...args: any[]): boolean => {
    for (let i = 0; i < args.length; i++) if (!args[i]) return false;
    return true;
};

/** truth if at least one is truth */
export const or: CI.SchemaCallbackSimple = (...args: any[]): boolean => {
    for (let i = 0; i < args.length; i++) if (args[i]) return true;
    return false;
};

/** boolean inversion */
export const not: CI.SchemaCallbackSimple = (value: any): boolean => {
    return !value;
};

/** similarly in JS: condition ? trueState : falseState */
export const ifCondition: CI.SchemaCallbackSimple = (test: boolean, trueState: any, falseState: any): any => {
    return test ? trueState : falseState;
};

/** similarly in JS: value || value || value; */
export const orValue: CI.SchemaCallbackSimple = (...args: any[]): any => {
    for (let i = 0; i < args.length - 1; i++) if (args[i]) return args[i];
    return args[args.length - 1];
};

/** similarly in JS: value && value && value; */
export const andValue: CI.SchemaCallbackSimple = (...args: any[]): any => {
    for (let i = 0; i < args.length - 1; i++) if (!args[i]) return args[i];
    return args[args.length - 1];
};

export const toNumber: CI.SchemaCallbackSimple = (v: string | number): number => {
    v = Number(v);
    if (Number.isNaN(v)) {
        v = 0;
        console.error('[error] toNumber: value must be a number.');
    }
    return v;
};

/** float number with two decimal places */
export const toMoneyFormat: CI.SchemaCallbackSimple = (v: string | number): string => {
    return (<number>toNumber(v)).toFixed(2);
};

export const toBoolean: CI.SchemaCallbackSimple = (v: any): boolean => {
    return Boolean(v);
};

export const toString: CI.SchemaCallbackSimple = (v: any): string => {
    return String(v);
};

export const isInRange: CI.SchemaCallbackSimple = ({ range: { min, max } }: { range: { min: number, max: number} }, control: number): boolean => {
    return control >= min && control <= max;
};

export const firstLetterUpperCase: CI.SchemaCallbackSimple = (word: string): string => {
    if (typeof word !== 'string') {
        console.error('firstLetterUpperCase: word must be a string.');
        return word;
    }
    return word.substring(0, 1).toUpperCase() + word.substring(1).toLowerCase();
};

export const toUpperCase: CI.SchemaCallbackSimple = (word: string): string => {
    if (typeof word !== 'string') {
        console.error('firstLetterUpperCase: word must be a string.');
        return word;
    }
    return word.toUpperCase();
};

export const underScoreToCamelCase: CI.SchemaCallbackSimple = (word: string): string => {
    if (typeof word !== 'string') {
        console.error('[error] underScoreOtCamelCase: word must be a string.');
        return word;
    }
    const parts = word.split('_').filter(Boolean);
    return parts.map((v) => firstLetterUpperCase(v)).join('');
};

export const toUppercase: CI.SchemaCallbackSimple = (word: string): string => {
    if (typeof word !== 'string') {
        console.error('[error] toUppercase: word must be a string.');
        return word;
    }
    return word.toUpperCase();
};

export const toLowercase: CI.SchemaCallbackSimple = (word: string): string => {
    if (typeof word !== 'string') {
        console.error('[error] toUppercase: word must be a string.');
        return word;
    }
    return word.toLowerCase();
};
