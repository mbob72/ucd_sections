/* eslint-disable key-spacing,indent */
import dataLinkParser from '../../data_link_parser/v2'
import getDataLink from './utils/data_link_cache'
import { isObject } from '../../data_link_parser/utils'
import runAsyncGenerator from '../utils/run_async_generator'

// todo: tokens, defaultData, _index_ and _objectId_ processing must be added.

/**
 * Parsing mode.
 * In the core mode only fields /^_.+?_$/ must be parsed.
 * In the user mode must be parsed all fields expect core's fields.
 * In the full mode all types of fields must be parsed.
 * In the shallow mode only string values must be parsed (top level of the current object or array in the passed dataLink).
 * In the deep mode all values must be parsed.
 * @type {{USER_DEEP: number, CORE_DEEP: number, USER_SHALLOW: number, FULL_DEEP: number, CORE_SHALLOW: number, FULL_SHALLOW: number}}
 */
const MODE = {
    USER_SHALLOW: 0b1001,
    CORE_SHALLOW: 0b1010,
    FULL_SHALLOW: 0b1011,
    USER_DEEP:    0b1101,
    CORE_DEEP:    0b1110,
    FULL_DEEP:    0b1111
}

/**
 * Asynchronous data parser.
 * @param {string|object|array} schema
 * @param {object|array} data
 * @param {object|array} rootData
 * @param {object} functions
 * @param {number} mode
 * @returns {Promise<*>}
 */
function asyncDataParser ({ schema, data, rootData, functions, mode = MODE.FULL_DEEP }) {
    return new Promise((resolve, reject) => {
        if (!rootData) rootData = data
        const iterator = switcher({ dataLink: schema, data, rootData, functions, mode })
        runAsyncGenerator(iterator, resolve, reject)
    })
}

/**
 * Synchronous data parser. Returns only final result of the iteration.
 * @param {string|object|any[]} schema
 * @param {object|any[]} data
 * @param {object|any[]} rootData
 * @param {object} functions
 * @param {number} mode
 * @returns {*}
 */
function syncDataParser ({ schema, data, rootData, functions, mode = MODE.FULL_DEEP }) {
    if (!rootData) rootData = data
    const generator = switcher({ dataLink: schema, data, rootData, functions, mode })
    let result
    while (true) {
        const { done, value } = generator.next(result)
        result = value
        if (done) return value
    }
}

/**
 * Data parser as a generator, client may process each yielded value.
 * @param {string|object|any[]} schema
 * @param {object|any[]} data
 * @param {object|any[]} rootData
 * @param {object} functions
 * @param {number} mode
 * @returns {Generator<*, *, *>}
 */
function* genDataParser ({ schema, data, rootData, functions, mode = MODE.FULL_DEEP }) {
    if (!rootData) rootData = data
    return yield* switcher({ dataLink: schema, data, rootData, functions, mode })
}

function* switcher (params) {
    const { dataLink, mode } = params
    // shallow or deep mode
    const modeCode = (mode & 0b1100) || 0b1100
    if (typeof dataLink === 'string') {
        return yield* dataLinkParser({ ...params, dataLink: getDataLink(dataLink) })
    } else if (isObject(dataLink)) {
        if (modeCode === 0b1000) return dataLink
        return yield* objectParser(params)
    } else if (Array.isArray(dataLink)) {
        if (modeCode === 0b1000) return dataLink
        return yield* arrayParser(params)
    } else if (typeof dataLink === 'undefined') {
        console.warn('[warning] dataParserV5: dataLink is undefined.')
        return void 0
    } else {
        return dataLink
    }
}

function* arrayParser (params) {
    const { dataLink } = params
    const arr = new Array(dataLink.length)
    for (let i = 0; i < dataLink.length; i++) {
        arr[i] = yield* switcher({ ...params, dataLink: dataLink[i] })
    }
    return arr
}

function* objectParser (params) {
    const { dataLink, mode } = params
    // user, core or full mode
    const modeCode = (mode & 3) || 3
    let { data } = params
    // _computations_ must be skipped on this step.
    const { _dataLink_, _computations_, _template_, ...others } = dataLink
    if (_dataLink_) {
        data = yield* switcher({ ...params, dataLink: _dataLink_, mode: MODE.USER_DEEP })
    }
    if (_template_) {
        if (!Array.isArray(data)) throw new Error('[error] dataParserV5: data must be an array.')
        const a = []
        for (const subData of data) {
            a.push(yield* switcher({ ...params, dataLink: _template_, data: subData }))
        }
        return a
    }
    const result = {}
    for (const key of Object.getOwnPropertyNames(others)) {
        if (modeCode !== 3) { // not full mode
            if (key[0] === '_' && key[key.length - 1] === '_' && modeCode === 1) continue // core's fields on user mode.
            if ((key[0] !== '_' || key[key.length - 1] === '_') && modeCode === 2) continue // user's field on core mode.
        }
        const parsedKey = yield* switcher({ ...params, dataLink: key, data })
        if (typeof parsedKey !== 'string') throw new Error('[error] dataParserV5: parsedKey must be a string.')
        result[parsedKey] = yield* switcher({ ...params, dataLink: dataLink[key], data })
    }
    return result
}

export {
    asyncDataParser,
    syncDataParser,
    genDataParser,
    MODE
}
