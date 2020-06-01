import { DataParserError } from '../../../data_parser/utils'
import { valueParser } from './general'
import spaceSkipping from './general/space_skipping'

/**
 * The ArrayParser reads a part of the data link string
 * that is surrounded by the [] symbols.
 * May contains any other data types.
 * It always returns an array in the result field.
 * @param {DataLinkParserParams} params
 * @returns {Array}
 */
const arrayParser = function* (params) {
    const {
        dataLink
    } = params
    let current = dataLink.getCurrentValue()
    const result = []
    if (current[1] !== '[') throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR)
    if (current[2] === ']') {
        dataLink.getNextValue()
        return []
    }
    for (current of dataLink) {
        switch (current[1]) {
            case '[':
                if (current[2] === ' ') {
                    spaceSkipping(params)
                    current = dataLink.getCurrentValue()
                }
                if (current[2] === ']') return []
            // eslint-disable-next-line no-fallthrough
            case ',':
                if (current[2] === ' ') {
                    spaceSkipping(params)
                    current = dataLink.getCurrentValue()
                }
                if (dataLink.isEnd()) throw new DataParserError(DataParserError.ERRORS.NESTING)
                if (current[2] === ',') throw new DataParserError(DataParserError.ERRORS.ARRAY_VALUE)
                current = dataLink.getNextValue()
                const value = yield* valueParser(params, true)
                result.push(value)
                current = dataLink.getCurrentValue()
                if (current[2] === ' ') {
                    spaceSkipping(params)
                    current = dataLink.getCurrentValue()
                }
                if (dataLink.isEnd()) throw new DataParserError(DataParserError.ERRORS.NESTING)
                if (current[2] === ',' || current[2] === ']') break
                throw new DataParserError(DataParserError.ERRORS.ARRAY_VALUE)
        }
        if (current[2] === ']') {
            dataLink.getNextValue()
            break
        }
    }
    return result
}

export default arrayParser
