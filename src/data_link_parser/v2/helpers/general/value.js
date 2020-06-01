import { DataParserError } from '../../../../data_parser/utils'
import indexParser from '../index'
import inAllowedSymbols from '../../../utils/in_allowed_symbols'
import primitivesConverter from '../../../utils/primitives_converter'

const setResult = (data, result) => {
    if (typeof result === 'undefined') {
        result = data
    } else {
        result += '' + data
    }
    return result
}

/**
 * The ValueParser reads a value of arrays and objects of the dataLink string.
 * @param {ParserParams} params
 * @param {boolean} arrayContext - true means an array context, false means an object context
 * @returns {*}
 */
const valueParser = function* (params, arrayContext) {
    const {
        dataLink
    } = params
    let current = dataLink.getCurrentValue()
    let result
    if (
        (arrayContext === true && current[0] !== '[' && current[0] !== ',' && current[0] !== ' ') ||
        (arrayContext === false && current[0] !== ':' && current[0] !== ' ') ||
        (typeof arrayContext === 'undefined' && current[0] !== '(' && current[0] !== ' ')
    ) {
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR)
    }
    for (current of dataLink) {
        switch (current[1]) {
            case ' ':
                throw new DataParserError(DataParserError.ERRORS.DEFAULT)
            case '\\':
                result = setResult(dataLink.getNextValue())
                break
            case '@': // link part
            case '$': // function part
            case '{': // object part
            case '[': // array part
            case '`': // escaped by the `` symbols string part
            case '(': // expression part
                result = setResult(yield* indexParser(params))
                if (dataLink.isEnd()) throw new DataParserError(DataParserError.ERRORS.NESTING)
                current = dataLink.getCurrentValue()
                break
            default: // plain text
                if (dataLink.isEnd()) throw new DataParserError(DataParserError.ERRORS.NESTING)
                if (!inAllowedSymbols(current[1])) {
                    if (arrayContext) {
                        throw new DataParserError(DataParserError.ERRORS.ARRAY_VALUE)
                    } else {
                        throw new DataParserError(DataParserError.ERRORS.OBJECT_VALUE)
                    }
                }
                result = (result || '') + setResult(current[1])
                break
        }
        switch (current[2]) {
            case ',':
            case ']':
            case ' ':
            case '}':
            case ')': // stop symbols for the value parser
                return primitivesConverter(result)
        }
    }

    throw new DataParserError(DataParserError.ERRORS.DEFAULT)
}

export default valueParser
