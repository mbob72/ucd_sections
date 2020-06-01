import { DataParserError } from '../../../data_parser/utils/data_parser_error'
import { valueParser, spaceSkipping } from './general'
import inAllowedSymbols from '../../utils/in_allowed_symbols'
import indexParser from './index'
const NOT_DEFINED = Symbol('NotDefined')
/**
 * The KeyParser reads a key of the current object of the data link string.
 * @param {DataLinkParserParams} params
 * @returns {string}
 */
const keyParser = (params) => {
    const { dataLink } = params
    let key = ''
    for (let current of dataLink) {
        if (current[1] === '{' || current[1] === '}') throw new DataParserError(DataParserError.ERRORS.NESTING)
        switch (current[1]) {
            case '(':
            case '@':
            case '$':
                const res = indexParser(params)
                if (typeof res !== 'string') throw new DataParserError(DataParserError.ERRORS.OBJECT_KEY_STRING)
                key += res
                current = dataLink.getCurrentValue()
                break
            case '\\':
                current = dataLink.getNextValue()
                key += current[1]
                break
            default:
                if (current[1] !== '/' && !inAllowedSymbols(current[1])) throw new DataParserError(DataParserError.ERRORS.OBJECT_KEY)
                key += current[1]
        }
        if (dataLink.isEnd()) throw new DataParserError(DataParserError.ERRORS.NESTING)
        if (current[2] === ':' || current[2] === ' ') break
    }
    return key
}

/**
 * The ObjectParser reads a part of the data link string
 * that is surround by the {} symbols.
 * @param {DataLinkParserParams} params
 * @returns {Object}
 */
const objectParser = (params) => {
    const {
        dataLink
    } = params
    let current = dataLink.getCurrentValue()
    const result = {}
    let key = NOT_DEFINED
    let value = NOT_DEFINED
    if (current[1] !== '{') {
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR)
    }

    for (current of dataLink) {
        switch (current[1]) {
            case ',':
            case '{':
                if (current[2] === ' ') {
                    spaceSkipping(params)
                    current = dataLink.getCurrentValue()
                }
                if (dataLink.isEnd()) throw new DataParserError(DataParserError.ERRORS.NESTING)
                dataLink.getNextValue()
                key = keyParser(params)
                current = dataLink.getCurrentValue()
                if (current[2] === ' ') {
                    spaceSkipping(params)
                    current = dataLink.getCurrentValue()
                }
                if (dataLink.isEnd() || current[2] !== ':') throw new DataParserError(DataParserError.ERRORS.OBJECT_KEY)
                break
            case ':':
                if (current[2] === ' ') {
                    spaceSkipping(params)
                    current = dataLink.getCurrentValue()
                }
                if (dataLink.isEnd() || current[2] === ',' || current[2] === '}') throw new DataParserError(DataParserError.ERRORS.OBJECT_VALUE)
                dataLink.getNextValue()
                value = valueParser(params, false)
                if (key && typeof key === 'string') { // ??
                    result[key] = value
                } else {
                    throw new DataParserError(DataParserError.ERRORS.OBJECT_KEY)
                }
                current = dataLink.getCurrentValue()
                if (current[2] === ' ') {
                    spaceSkipping(params)
                    current = dataLink.getCurrentValue()
                }
                if (current[2] === ',' || current[2] === '}') break
                throw new DataParserError(DataParserError.ERRORS.OBJECT_VALUE)
            default:
                throw new DataParserError(DataParserError.ERRORS.DEFAULT)
        }
        if (dataLink.isEnd()) throw new DataParserError(DataParserError.ERRORS.NESTING)
        if (current[2] === '}') {
            dataLink.getNextValue()
            break
        }
    }

    return result
}

export default objectParser
