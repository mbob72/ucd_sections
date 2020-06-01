// experimental functions

import { strictlyIsObject } from '../utils'

/**
 * Promise based sections did-mount-processor:
 *  All schemas are parsed just before rendering in the current sections logic,
 *  this processor should be called after each of section is parsed and rendered and
 *  this processor receives parsed object of each section and
 *  passes them to a callback for processing.
 *  Result of the processing is passed to a setState callback.
 * It needs in a state of parent section.
 */
export const sectionsDidMountProcessor = (processor) => {
    return (sections, setState) => {
        if (typeof processor !== 'function') throw new Error('processor must be a function.')
        if (typeof setState !== 'function') throw new Error('setState must be a function.')
        if (!Array.isArray(sections)) throw new Error('Sections list must be an array.')
        const promises = []
        const newSections = []
        for (let index = 0; index < sections.length; index++) {
            if (!strictlyIsObject(sections[index])) throw new Error('Section must be an Object.')
            let resolveF = null
            const promise = new Promise((resolve) => {
                resolveF = resolve
            })
            promises.push(promise)
            const newSectionObject = Object.create(
                {},
                {
                    ...Object.getOwnPropertyDescriptors(sections[index]),
                    resolve: {
                        value: resolveF,
                        enumerable: false
                    }
                }
            )
            newSections.push(newSectionObject)
        }

        Promise
            .all(promises)
            .then((parsedSections) => {
                const res = processor(parsedSections)
                if (res instanceof Promise) {
                    return res
                        .then((result) => {
                            setState(result)
                        })
                } else {
                    setState(res)
                }
            })
            .catch((err) => console.error(err))

        return newSections
    }
}

/* demo - start */
/**
 * Generator might be returned
 * @returns {function(*, *): {value: *}}
 */
export const generatorComputation = () => {
    return function* (input, env) {
        const value = yield Promise.resolve('liave')
        const value2 = yield new Promise((resolve, reject) => {
            setTimeout(() => resolve(value + '_liave2'), 10000)
        })
        return { ...input, value: value2 }
    }
}

export const generatorComputation2 = () => {
    return function* (input, env) {
        const value = yield Promise.resolve('value')
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve({ ...input, value: value + '_value2' }), 10000)
        })
    }
}
/* demo - end */
