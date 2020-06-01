import { DataParserError } from '../../../data_parser/utils'

/**
 * The EscapedPlainParser reads a part of the data link string
 * that is surrounded by the `` symbols.
 * @param {DataLinkParserParams} params
 * @returns {String}
 */
const escapedPlainParser = (params) => {
    const { dataLink } = params
    let result = ''
    let current = dataLink.getCurrentValue()
    if (current[1] !== '`') {
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR)
    }
    dataLink.getNextValue()
    for (current of dataLink) {
        if (current[1] === '`') break
        if (current[1] === '\\') current = dataLink.getNextValue()
        if (dataLink.isEnd()) throw new DataParserError(DataParserError.ERRORS.DEFAULT)
        result += current[1]
    }
    return result
}

export default escapedPlainParser