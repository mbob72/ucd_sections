/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataParserError } from '../data_parser_error';
import inAllowedSymbols from '../../utils/in_allowed_symbols';
import { expressionParser } from './index';
import { DataLinkParserInterfaces } from 'types/types';

/**
 * The FunctionParser reads a part of the dataLink string
 * that starts from $ symbol and ends by (.
 */
const functionParser = function* (params: DataLinkParserInterfaces.v2.Params): Generator<any, any, any> {
    const { dataLink, functions, data } = params;
    let current = dataLink.getCurrentValue();
    if (current[1] !== '$') {
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR, data, dataLink);
    }
    if (!inAllowedSymbols(current[2])) {
        throw new DataParserError(DataParserError.ERRORS.FUNCTION_NAMING, data, dataLink);
    }
    current = dataLink.getNextValue();
    let functionName = '';

    for (current of dataLink) {
        functionName += current[1];
        if (!inAllowedSymbols(current[2])) break;
    }

    const f = functions[functionName];
    if (typeof f !== 'function') {
        if (
            current[2] !== '(' &&
            !dataLink.isEnd() &&
            !inAllowedSymbols(current[2])
        ) {
            throw new DataParserError(DataParserError.ERRORS.FUNCTION_NAMING, data, dataLink);
        }
        throw new DataParserError(DataParserError.ERRORS.FUNCTION_UNKNOWN, data, dataLink);
    }
    if (current[2] === '(') {
        dataLink.getNextValue();
        return f(...yield* expressionParser(params, true));
    } else {
        return f;
    }
};

export default functionParser;
