/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataParserError } from '../data_parser_error';
import indexParser from './index';
import spaceSkipping from './general/space_skipping';
import { valueParser } from './general';
import { DataLinkParserInterfaces } from '../../../../types/types';

/**
 * The ExpressionParser reads a part of the data link string
 * that is surrounded by the () symbols.
 * It might be called in a function context or in a plain context. The plain context is default.
 * In function context it always returns an array in the result field.
 * In plain context the result field contains any data.
 */
const expressionParser = function* (params: DataLinkParserInterfaces.v2.Params, functionContext?: boolean): Generator<any, any, any> {
    return functionContext
        ? yield* functionExpression(params)
        : yield* simpleExpression(params);
};
/**
 * Expression in a function context, returns an array of the function's params.
 */
const functionExpression = function* (params: DataLinkParserInterfaces.v2.Params): Generator<any, any[], any> {
    const { dataLink, data } = params;
    const result: any[] = [];
    let current = dataLink.getCurrentValue();
    if (current[1] !== '(') {
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR, data, dataLink);
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
                    throw new DataParserError(DataParserError.ERRORS.NESTING, data, dataLink);
                if (current[2] === ',')
                    throw new DataParserError(DataParserError.ERRORS.FUNCTION_ARGUMENTS, data, dataLink);
                current = dataLink.getNextValue();
                result.push(yield* valueParser(params));
                current = dataLink.getCurrentValue();
                if (current[2] === ' ') {
                    spaceSkipping(params);
                    current = dataLink.getCurrentValue();
                }
                if (dataLink.isEnd())
                    throw new DataParserError(DataParserError.ERRORS.NESTING, data, dataLink);
                if (current[2] === ',' || current[2] === ')') break;
                throw new DataParserError(DataParserError.ERRORS.FUNCTION_ARGUMENTS, data, dataLink);
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
 */
const simpleExpression = function* (params: DataLinkParserInterfaces.v2.Params): Generator<any, string, any> {
    const { dataLink, data } = params;
    let result = '';
    let current = dataLink.getCurrentValue();
    if (current[1] !== '(')
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR, data, dataLink);
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
        switch (current[1]) {
            case '@': // link part
            case '$': // function part
            case '{': // object part
            case '[': // array part
            case '`': // escaped by the `` symbols string part
            case '(': // expression part
                result += yield* indexParser(params);
                if (dataLink.isEnd())
                    throw new DataParserError(DataParserError.ERRORS.NESTING, data, dataLink);
                current = dataLink.getCurrentValue();
                break;
            case '\\':
                result += current[2];
                current = dataLink.getNextValue();
                if (dataLink.isEnd())
                    throw new DataParserError(DataParserError.ERRORS.NESTING, data, dataLink);
                break;
            case ' ':
                // eslint-disable-next-line no-case-declarations
                let spaces = ' ';
                if (current[2] === ' ') {
                    spaces = spaceSkipping(params);
                    current = dataLink.getCurrentValue();
                    if (dataLink.isEnd())
                        throw new DataParserError(DataParserError.ERRORS.NESTING, data, dataLink);
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
