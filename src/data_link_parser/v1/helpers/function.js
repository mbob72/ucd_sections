import { DataParserError } from '../../../data_parser/utils/data_parser_error'
import inAllowedSymbols from '../../utils/in_allowed_symbols'
import { expressionParser } from './index'
import { isContextualRenderFunctions } from '../../utils/contextual_render_functions'

/**
 * The FunctionParser reads a part of the dataLink string
 * that starts from $ symbol and ends by (.
 * @param {Params} params
 * @returns {*}
 */
const functionParser = (params) => {
    const {
        dataLink,
        renderFunctions,
        data
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

    const f = renderFunctions[functionName]
    if (typeof f !== 'function') {
        if (current[2] !== '(' && !dataLink.isEnd() && !inAllowedSymbols(current[2])) {
            throw new DataParserError(DataParserError.ERRORS.FUNCTION_NAMING)
        }
        throw new DataParserError(DataParserError.ERRORS.FUNCTION_UNKNOWN)
    }
    const context = isContextualRenderFunctions(renderFunctions) ? renderFunctions : data
    if (current[2] === '(') {
        dataLink.getNextValue()
        return f.apply(context, expressionParser(params, true))
    } else {
        return f.bind(context) // it saves the current dynamic context, just in case.
    }
}

export default functionParser
