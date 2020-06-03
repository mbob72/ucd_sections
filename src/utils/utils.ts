export const isBoolean = (possibleBoolean: unknown): boolean =>
    typeof possibleBoolean === 'boolean';

export const isString = (possibleString: unknown): boolean =>
    typeof possibleString === 'string';

export const isNumber = (possibleNumber: unknown): boolean =>
    typeof possibleNumber === 'number';

export const isObject = (possibleObject: unknown): boolean =>
    typeof possibleObject === 'object';

export const strictlyIsObject = (possibleObject: unknown): boolean =>
    Object.prototype.toString.call(possibleObject) === '[object Object]';

export const isError = (possibleError: unknown): boolean =>
    Object.prototype.toString.call(possibleError) === '[object Error]';

export const isArray = (possibleArray: unknown): boolean =>
    Array.isArray(possibleArray);

export const isDate = (possibleDate: unknown): boolean =>
    possibleDate instanceof Date;

export const isFunction = (possibleFunction: unknown): boolean =>
    typeof possibleFunction === 'function';

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export const isReactElement = (el: any): boolean =>
    isObject(el) && el.$$typeof === Symbol.for('react.element');

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export const isEmpty = (value: any): boolean => {
    // todo: should be refactored. This method contains a very strange code.
    if (isBoolean(value)) return false;
    if (isString(value)) return value === '';
    if (isNumber(value)) return isNaN(value);
    if (isDate(value)) return false;
    if (isObject(value)) {
        if (value === null) return true;
        if (isArray(value)) return value.length === 0;
        return Object.keys(value).length === 0;
    }
    return !value;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export const buildClassNames = (styles: Record<string, string> = {}, className: string[], prefix = ''): string | string[]  => {
    if (isObject(className)) {
        if (isArray(className))
            return className.map(
                (cName: string): string => styles[`${prefix}${cName}`]
            );
        else {
            const acc: Record<string, unknown> = {};
            Object.entries(className).reduce<Record<string, unknown>>((acc, [ cName, condition ]) => {
                acc[styles[`${prefix}${cName}`]] = condition;
                return acc;
            }, acc);
        }
    }
    if (isString(className))
        return styles[`${prefix}${className}`] || className;
    return '';
};

const timeouts: Record<string, number> = {};
export const debounce = (callback: () => unknown, delay = 0, symbol = Symbol('debounced')): symbol => {
    if (typeof callback !== 'function')
        throw new Error('debounce: no callback!');
    delay = +delay;
    if (isNaN(delay)) throw new Error('debounce: delay should be number!');
    if (typeof symbol !== 'symbol') symbol = Symbol(symbol);
    // symbol.toString() has been added for backward compatibility and compatibility with typescript.
    if (timeouts[symbol.toString()]) clearTimeout(timeouts[symbol.toString()]);

    // window.setTimeout has been added for compatibility with typescript.
    timeouts[symbol.toString()] = window.setTimeout(() => {
        callback();
        delete timeouts[symbol.toString()];
    }, delay);

    return symbol;
};

export const doNothing = (): void => void 0;

export const isIframe = (win: Window): boolean => {
    try {
        return Boolean(
            win.location !== win.parent.location ||
                win.self !== win.top ||
                win.self.frameElement &&
                    (win.self.frameElement + '').indexOf('HTMLIFrameElement') >
                        -1
        );
    } catch (e) {
        console.error('[error] isIframe:', e.message, e.stack);
    }
    return false;
};
