import { DataParserError } from '../../../data_parser/utils'
import inAllowedSymbols from '../../utils/in_allowed_symbols'
import { expressionParser } from './index'

/**
 * The FunctionParser reads a part of the dataLink string
 * that starts from $ symbol and ends by (.
 * @param {Params} params
 * @returns {*}
 */
const functionParser = function* (params) {
    const {
        dataLink,
        functions
    } = params
    let current = dataLink.getCurrentValue()
    if (current[1] !== '$') {
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR)
    }
    if (!inAllowedSymbols(current[2])) {
        throw new DataParserError(DataParserError.ERRORS.FUNCTION_NAMING)
    }
    current = dataLink.getNextValue()
    let functionName = ''

    for (current of dataLink) {
        functionName += current[1]
        if (!inAllowedSymbols(current[2])) break
    }

    const f = functions[functionName]
    if (typeof f !== 'function') {
        if (current[2] !== '(' && !dataLink.isEnd() && !inAllowedSymbols(current[2])) {
            throw new DataParserError(DataParserError.ERRORS.FUNCTION_NAMING)
        }
        throw new DataParserError(DataParserError.ERRORS.FUNCTION_UNKNOWN)
    }
    if (current[2] === '(') {
        dataLink.getNextValue()
        return f(...yield* expressionParser(params, true))
    } else {
        return f
    }
}

export default functionParser
