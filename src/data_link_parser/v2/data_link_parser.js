
import indexParser from './helpers'
import { DataParserError } from '../../data_parser/utils'
import { DataLink } from './index'

/**
 * Returns a string if the main result is not empty,
 * on top level all data should be concatenated and represented as a string.
 * @param result
 * @param mainResult
 * @returns {any}
 */
const setResult = (result, mainResult) => {
    return (mainResult) ? '' + mainResult + result : result
}
/**
 * Root parser of a data link string,
 * it delegates the work to helper parsers.
 * Helper parsers return a result of parsing and
 * a new state of the iterator.
 * @param {*} params
 * @returns {*}
 */
const dataLinkParser = function* (params) {
    const {
        dataLink
    } = params
    if (!(dataLink instanceof DataLink)) throw new DataParserError(DataParserError.ERRORS.DATA_LINK_TYPE)
    let mainResult = void 0

    try {
        for (const current of dataLink) {
            switch (current[1]) {
                case '@': // link part
                case '$': // function part
                case '{': // object part
                case '[': // array part
                case '`': // escaped by the `` symbols string part
                case '(': // expression part
                    mainResult = setResult(yield* indexParser(params), mainResult)
                    break
                case '\\':
                    // escaped by the \ symbol part
                    mainResult = setResult(current[2], mainResult)
                    dataLink.getNextValue()
                    break
                case '}':
                case ']':
                case ')':
                    // unprocessed close symbols
                    throw new DataParserError(DataParserError.ERRORS.NESTING)
                default:
                    // plain symbol
                    mainResult = setResult(current[1], mainResult)
                    break
            }
            if (dataLink.isEnd()) break
        }
    } catch (Err) {
        if (Err instanceof DataParserError) {
            const info = dataLink.getCursorPositionInfo()
            Err.fullMessage = Err.message + ', dataLink: "' + info + '" at position ' + dataLink.getCurrentIndex()
            if (dataLink.isEnd()) {
                Err.fullMessage += ' (out of the string)'
            }
            Err.data = params.data
        }
        console.error(Err)
        throw Err
    }

    return mainResult
}

export default dataLinkParser
