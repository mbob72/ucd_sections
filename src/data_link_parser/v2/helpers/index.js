import arrayParser from './array';
import expressionParser from './expression';
import functionParser from './function';
import linkParser from './link';
import objectParser from './object';
import escapedPlainParser from './plain';
import { DataParserError } from '../../../data_parser/utils';
import { DataLink } from '../';

export {
    arrayParser,
    expressionParser,
    functionParser,
    linkParser,
    objectParser,
    escapedPlainParser,
};

/**
 * The IndexParser is the main parser controller
 * that delegates the parsing process to other parsers.
 * @param {ParserParams} params
 * @returns {*}
 */
const indexParser = function* (params) {
    const { dataLink } = params;
    if (!(dataLink instanceof DataLink))
        throw new DataParserError(DataParserError.ERRORS.DATA_LINK_TYPE);
    const symbol = dataLink.getCurrentValue()[1];
    switch (symbol) {
        case '@': // link part
            return yield* linkParser(params);
        case '$': // function part
            return yield* functionParser(params);
        case '{': // object part
            return yield* objectParser(params);
        case '[': // array part
            return yield* arrayParser(params);
        case '(': // expression part
            return yield* expressionParser(params);
        case '`': // escaped by the `` symbols string part
            return escapedPlainParser(params);
        default:
            throw new DataParserError(DataParserError.ERRORS.DEFAULT);
    }
};

export default indexParser;
