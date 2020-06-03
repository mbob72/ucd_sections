export * as asyncComputations from './async_computations.js';
export * as experimentalComputations from './experimental.js';

/** truth if the passed values are strictly equal */
export const isEqual = (value, control) => {
    return value === control;
};

/** truth if all values are truth */
export const and = (...args) => {
    for (let i = 0; i < args.length; i++) if (!args[i]) return false;
    return true;
};

/** truth if at least one is truth */
export const or = (...args) => {
    for (let i = 0; i < args.length; i++) if (args[i]) return true;
    return false;
};

/** boolean inversion */
export const not = (value) => {
    return !value;
};

/** similarly in JS: condition ? trueState : falseState */
export const ifCondition = (test, trueState, falseState) => {
    return test ? trueState : falseState;
};

/** similarly in JS: value || value || value; */
export const orValue = (...args) => {
    for (let i = 0; i < args.length - 1; i++) if (args[i]) return args[i];
    return args[args.length - 1];
};

/** similarly in JS: value && value && value; */
export const andValue = (...args) => {
    for (let i = 0; i < args.length - 1; i++) if (!args[i]) return args[i];
    return args[args.length - 1];
};

export const toNumber = (v) => {
    v = Number(v);
    if (Number.isNaN(v)) {
        v = 0;
        console.error('[error] toNumber: value must be a number.');
    }
    return v;
};

/** float number with two decimal places */
export const toMoneyFormat = (v) => {
    return toNumber(v).toFixed(2);
};

export const toBoolean = (v) => {
    return Boolean(v);
};

export const toString = (v) => {
    return String(v);
};

export const isInRange = ({ range: { min, max } }, control) => {
    return control >= min && control <= max;
};

export const firstLetterUpperCase = (word) => {
    if (typeof word !== 'string') {
        console.error('firstLetterUpperCase: word must be a string.');
        return word;
    }
    return word.substring(0, 1).toUpperCase() + word.substring(1).toLowerCase();
};

export const toUpperCase = (word) => {
    if (typeof word !== 'string') {
        console.error('firstLetterUpperCase: word must be a string.');
        return word;
    }
    return word.toUpperCase();
};

export const underScoreToCamelCase = (word) => {
    if (typeof word !== 'string') {
        console.error('[error] underScoreOtCamelCase: word must be a string.');
        return word;
    }
    const parts = word.split('_').filter(Boolean);
    return parts.map((v) => firstLetterUpperCase(v)).join('');
};

export const toUppercase = (word) => {
    if (typeof word !== 'string') {
        console.error('[error] toUppercase: word must be a string.');
        return word;
    }
    return word.toUpperCase();
};

export const toLowercase = (word) => {
    if (typeof word !== 'string') {
        console.error('[error] toUppercase: word must be a string.');
        return word;
    }
    return word.toLowerCase();
};
