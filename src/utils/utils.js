export const isBoolean = possibleBoolean => typeof possibleBoolean === 'boolean'

export const isString = possibleString => typeof possibleString === 'string'

export const isNumber = possibleNumber => typeof possibleNumber === 'number'

export const isObject = possibleObject => typeof possibleObject === 'object'

export const strictlyIsObject = possibleObject => Object.prototype.toString.call(possibleObject) === '[object Object]'

export const isError = possibleError => Object.prototype.toString.call(possibleError) === '[object Error]'

export const isArray = possibleArray => Array.isArray(possibleArray)

export const isDate = possibleDate => possibleDate instanceof Date

export const isFunction = possibleFunction => typeof possibleFunction === 'function'

export const isReactElement = el => isObject(el) && el.$$typeof === Symbol.for('react.element')

export const isEmpty = value => {
    // todo: should be refactored. This method contains a very strange code.
    if (isBoolean(value)) return false
    if (isString(value)) return value === ''
    if (isNumber(value)) return isNaN(value)
    if (isDate(value)) return false
    if (isObject(value)) {
        if (value === null) return true
        if (isArray(value)) return value.length === 0
        return Object.keys(value).length === 0
    }
    return !value
}

export const buildClassNames = (styles = {}, className, prefix = '') => {
    if (isObject(className)) {
        if (isArray(className)) return className.map(cName => styles[`${prefix}${cName}`])
        else {
            Object.entries(className).reduce((acc, [cName, condition]) => {
                acc[styles[`${prefix}${cName}`]] = condition
                return acc
            }, {})
        }
    }
    if (isString(className)) return styles[`${prefix}${className}`] || className
    return ''
}

const timeouts = {}
export const debounce = (callback, delay = 0, symbol = Symbol('debounced')) => {
    if (typeof callback !== 'function') throw new Error('debounce: no callback!')
    delay = +delay
    if (isNaN(delay)) throw new Error('debounce: delay should be number!')
    if (typeof symbol !== 'symbol') symbol = Symbol(symbol)
    if (timeouts[symbol]) clearTimeout(timeouts[symbol])

    timeouts[symbol] = setTimeout(() => {
        callback()
        delete timeouts[symbol]
    }, delay)

    return symbol
}

export const doNothing = () => {}

export const isIframe = win => {
    try {
        return Boolean(
            win.location !== win.parent.location ||
            win.self !== win.top ||
            (win.self.frameElement && (win.self.frameElement + '').indexOf('HTMLIFrameElement') > -1)
        )
    } catch (e) {
        console.error('[error] isIframe:', e.message, e.stack)
    }
}
