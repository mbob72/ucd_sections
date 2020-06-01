let emptyArrayFlag = false

/**
 * Is duplicated for stringify possibility.
 * @param value
 * @returns {boolean}
 */
const isObject = value => Object.prototype.toString.call(value) === '[object Object]'

/**
 * Slow and flexible deep copier.
 * @param data
 * @returns {[]}
 */
const deepCopy = (data) => {
    if (isObject(data)) {
        const props = Object.getOwnPropertyDescriptors(data)
        for (const i of Object.getOwnPropertyNames(props)) {
            if (!props.hasOwnProperty(i)) continue
            props[i].value = getValue(props[i].value)
        }
        for (const i of Object.getOwnPropertySymbols(props)) {
            if (!props.hasOwnProperty(i)) continue
            props[i].value = getValue(props[i].value)
        }
        return Object.create(
            Object.getPrototypeOf(data),
            props
        )
    }
    if (Array.isArray(data)) {
        const clone = []
        for (const i of data) {
            clone.push(getValue(i))
        }
        return clone
    }
}

const getValue = value => {
    if (isObject(value) || Array.isArray(value)) {
        return deepCopy(value)
    } else {
        return value
    }
}

/**
 * This method returns a constructor that can be used to copy objects that have the same structure as the structure of the source object.
 * The given constructor is very fast but is not efficient on irregular structured objects in arrays and empty arrays that could be filled later.
 * @todo:
 *   1) add a processing the next types of object: regexp, date, map, set, function, generator and boxed primitives.
 *   2) add symbol keys processing.
 * @param {Object} source
 * @returns {Function}
 * @example
 * let Copy = getDeepCopyConstructor(source); // should be created only at once
 * let deepCopiedObject = new Copy(sourceOrSourceSimilarObject); // should be used many times
 */
const getDeepCopyConstructor = source => {
    if (!isObject(source)) throw new Error('DeepCopy: the source should be an object!')
    const constructorBody = getConstructorBody(source)
    if (emptyArrayFlag) {
        constructorBody.push(isObject.toString(), getValue.toString(), deepCopy.toString())
    }
    // eslint-disable-next-line no-new-func
    return new Function('source', constructorBody.join(''))
}

const getConstructorBody = (source, path = '', constructorBody = [], arrayLevel = 0) => {
    if (!path && !isObject(source)) {
        throw new Error('DeepCopy: The root should be an object!')
    }

    if (!path) {
        constructorBody.push('if', '(', '!new.target', ')', 'throw new Error("DeepCopy must be invoked with the \'new\' operator!")', ';')
        emptyArrayFlag = false
    }

    if (Array.isArray(source)) {
        if (!source.length) {
            emptyArrayFlag = true
            constructorBody.push('this', '.', path, '=', 'deepCopy', '(', 'source', '.', path, ')', ';')
            return
        }
        arrayLevel++
        constructorBody.push('this', '.', path, '=', '[', ']', ';')
        constructorBody.push('for', '(', 'let ', 'i', arrayLevel, '=', '0', ';', 'i', arrayLevel, '<', 'source', '.', path, '.', 'length', ';', 'i', arrayLevel, '++', ')', '{')
        // An array with identical structured objects is expected,
        // so that we use only the first object for body generation.
        getConstructorBody(source[0], path + '[' + 'i' + arrayLevel + ']', constructorBody, arrayLevel)
        constructorBody.push('}')
    } else if (isObject(source)) {
        path && constructorBody.push('this', '.', path, '=', '{', '}', ';')
        for (const key in source) {
            if (!source.hasOwnProperty(key)) continue
            if (isObject(source[key]) || Array.isArray(source[key])) {
                const newKey = path ? path + '.' + key : key
                getConstructorBody(source[key], newKey, constructorBody, arrayLevel)
            } else {
                constructorBody.push('this')
                path && constructorBody.push('.', path)
                constructorBody.push('.', key, '=', 'source')
                path && constructorBody.push('.', path)
                constructorBody.push('.', key, ';')
            }
        }
    } else {
        // from array processing
        constructorBody.push('this', '.', path, '=', 'source', '.', path, ';')
    }

    return constructorBody
}

export {
    deepCopy,
    getDeepCopyConstructor
}
