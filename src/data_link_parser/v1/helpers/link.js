import inAllowedSymbols from '../../utils/in_allowed_symbols'
import isObject from '../../utils/is_object'
import { DataParserError } from '../../../data_parser/utils/data_parser_error'
import indexParser from './index'

/**
 * Reads a slash separated part of a link of the DataLink,
 * return an Object.
 * @param params
 * @param data
 * @returns {Object}
 */
const readLinkPart = (params, data) => {
    const {
        dataLink,
        defaultValue
    } = params
    let part = ''
    let computed = false
    let current = dataLink.getCurrentValue()
    if (current[1] !== '/' && current[1] !== '@') {
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR)
    }
    if (dataLink.isEnd()) return data
    dataLink.getNextValue()
    for (current of dataLink) {
        switch (current[1]) {
            case '<': // index part
                if (current[0] !== '/') throw new DataParserError(DataParserError.ERRORS.INDEX_PART)
                return readIndexName(params, data)
            case ':': // token part
                part = readToken(params, data)
                break
            case '$': // function part
            case '{': // object part
            case '[': // array part
            case '(': // expression part
                if (current[0] !== '/' && current[0] !== '@') throw new DataParserError(DataParserError.ERRORS.LINK)
                part = indexParser({ ...params, data })
                computed = true
                break
            case '\\': // escaped symbol
                if (typeof part !== 'string') throw new DataParserError(DataParserError.ERRORS.LINK)
                if (current[2] === ' ') throw new DataParserError(DataParserError.ERRORS.LINK)
                part += current[2]
                dataLink.getNextValue()
                break
            default:
                if (!inAllowedSymbols(current[1])) throw new DataParserError(DataParserError.ERRORS.LINK)
                if (typeof part !== 'string') throw new DataParserError(DataParserError.ERRORS.LINK)
                part += current[1]
        }
        current = dataLink.getCurrentValue()
        if (dataLink.isEnd() || current[2] === '/' || (current[2] !== '\\' && !inAllowedSymbols(current[2]))) {
            break
        }
        computed = false
    }
    if (typeof part === 'string') {
        if (computed && current[2] !== '/') return part
        if (!isObject(data) && !Array.isArray(data)) return defaultValue
        if (part && /^\d+$/.test(part) && Array.isArray(data)) return data[Number(part)] || defaultValue
        if (part && isObject(data)) return typeof data[part] === 'undefined' ? defaultValue : data[part]
        return defaultValue
    }
    return part
}
/**
 * Reads a name of a token of the data.
 * @param params
 * @param data
 * @returns {string}
 */
const readToken = (params, data) => {
    const {
        dataLink,
        defaultValue,
        tokens = {}
    } = params
    let token = ''
    let current = dataLink.getCurrentValue()
    if (current[1] !== ':') {
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR)
    }
    if ((current[0] !== '/' && current[0] !== '@') || dataLink.isEnd() || (current[2] !== '\\' && !inAllowedSymbols(current[2]))) {
        throw new DataParserError(DataParserError.ERRORS.LINK)
    }
    dataLink.getNextValue()
    for (current of dataLink) {
        token += current[1]
        if (dataLink.isEnd() || (current[2] !== '\\' && (current[2] === '/' || !inAllowedSymbols(current[2])))) break
    }
    // the passed object of tokens is sometimes provided by the qs.parse method that created it with the null prototype.
    const key = token && Object.prototype.hasOwnProperty.call(tokens, token) ? tokens[token] : 0
    if (!isObject(data) && !Array.isArray(data)) {
        console.warn('Error: The data should be an object or an array!')
        return defaultValue
    }
    const res = data[key]
    return typeof res === 'undefined' ? defaultValue : res
}
/**
 * Reads a name of data array items index.
 * @param params
 * @param data
 * @returns {string}
 */
const readIndexName = (params, data) => {
    const {
        dataLink
    } = params
    let indexName = ''
    let current = dataLink.getCurrentValue()
    if (!Array.isArray(data)) {
        throw new DataParserError(DataParserError.ERRORS.INDEX_NOT_ARRAY_DATA)
    }
    if (current[1] !== '<') {
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR)
    }
    if (current[2] === '>' || current[0] !== '/') {
        throw new DataParserError(DataParserError.ERRORS.INDEX_EMPTY)
    }
    dataLink.getNextValue()
    for (current of dataLink) {
        if (inAllowedSymbols(current[1])) {
            indexName += current[1]
        } else {
            throw new DataParserError(DataParserError.ERRORS.INDEX_NAME)
        }
        if (current[2] === '>') break
    }
    current = dataLink.getNextValue()
    if (current[2] === '/') throw new DataParserError(DataParserError.ERRORS.INDEX_LAST)
    if (inAllowedSymbols(current[2])) throw new DataParserError(DataParserError.ERRORS.INDEX_PART)
    for (const i in data) data[i][indexName] = i
    return data
}

const linkParser = (params) => {
    const {
        dataLink,
        data,
        rootData
    } = params
    let current = dataLink.getCurrentValue()
    if (current[1] !== '@') throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR)
    let localData = data
    if (current[2] === '/') {
        localData = rootData
        dataLink.getNextValue()
    }
    for (current of dataLink) {
        if (current[1] === '/' || current[1] === '@') {
            localData = readLinkPart(params, localData)
        } else {
            throw new DataParserError(DataParserError.ERRORS.LINK)
        }
        current = dataLink.getCurrentValue()
        if (dataLink.isEnd() || (current[2] !== '/' && !inAllowedSymbols(current[2]))) break
    }
    return localData
}

export default linkParser
