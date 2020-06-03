import { DataParserError } from '../../../data_parser/utils/data_parser_error';
import indexParser from './index';
import spaceSkipping from './general/space_skipping';
import { valueParser } from './general';

/**
 * The ExpressionParser reads a part of the data link string
 * that is surrounded by the () symbols.
 * It might be called in a function context or in a plain context. The plain context is default.
 * In function context it always returns an array in the result field.
 * In plain context the result field contains any data.
 * @param {ParserParams} params
 * @param {boolean} functionContext
 * @returns {*}
 */
const expressionParser = (params, functionContext) => {
    return functionContext
        ? functionExpression(params)
        : simpleExpression(params);
};
/**
 * Expression in a function context, returns an array of the function's params.
 * @param params
 * @returns {[]|Array}
 */
const functionExpression = (params) => {
    const { dataLink } = params;
    const result = [];
    let current = dataLink.getCurrentValue();
    if (current[1] !== '(') {
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR);
    }
    for (current of dataLink) {
        switch (current[1]) {
            case '(':
                if (current[2] === ' ') {
                    spaceSkipping(params);
                    current = dataLink.getCurrentValue();
                }
                if (current[2] === ')') break;
            // eslint-disable-next-line no-fallthrough
            case ',':
                if (current[2] === ' ') {
                    spaceSkipping(params);
                    current = dataLink.getCurrentValue();
                }
                if (dataLink.isEnd())
                    throw new DataParserError(DataParserError.ERRORS.NESTING);
                if (current[2] === ',')
                    throw new DataParserError(
                        DataParserError.ERRORS.FUNCTION_ARGUMENTS
                    );
                current = dataLink.getNextValue();
                result.push(valueParser(params));
                current = dataLink.getCurrentValue();
                if (current[2] === ' ') {
                    spaceSkipping(params);
                    current = dataLink.getCurrentValue();
                }
                if (dataLink.isEnd())
                    throw new DataParserError(DataParserError.ERRORS.NESTING);
                if (current[2] === ',' || current[2] === ')') break;
                throw new DataParserError(
                    DataParserError.ERRORS.FUNCTION_ARGUMENTS
                );
        }
        if (current[2] === ')') {
            dataLink.getNextValue();
            break;
        }
    }
    return result;
};
/**
 * Simple expression context, returns a string.
 * @param params
 * @returns {string}
 */
const simpleExpression = (params) => {
    const { dataLink } = params;
    let result = '';
    let current = dataLink.getCurrentValue();
    if (current[1] !== '(')
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR);
    if (current[2] === ' ') {
        spaceSkipping(params);
        current = dataLink.getCurrentValue();
    }
    if (current[2] === ')') {
        dataLink.getNextValue();
        return '';
    }
    dataLink.getNextValue();
    for (current of dataLink) {
        if (dataLink.isEnd())
            throw new DataParserError(DataParserError.ERRORS.NESTING);
        switch (current[1]) {
            case '@': // link part
            case '$': // function part
            case '{': // object part
            case '[': // array part
            case '`': // escaped by the `` symbols string part
            case '(': // expression part
                result += indexParser(params);
                if (dataLink.isEnd())
                    throw new DataParserError(DataParserError.ERRORS.NESTING);
                current = dataLink.getCurrentValue();
                break;
            case '\\':
                result += current[2];
                current = dataLink.getNextValue();
                break;
            case ' ':
                let spaces = ' ';
                if (current[2] === ' ') {
                    spaces += spaceSkipping(params);
                    current = dataLink.getCurrentValue();
                    if (dataLink.isEnd())
                        throw new DataParserError(
                            DataParserError.ERRORS.NESTING
                        );
                }
                current = dataLink.getCurrentValue();
                if (current[2] === ')') break;
                result += spaces;
                break;
            default:
                result += current[1];
                break;
        }
        if (current[2] === ')') {
            dataLink.getNextValue();
            break;
        }
    }
    return result;
};

export default expressionParser;
