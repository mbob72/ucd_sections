import indexParser from './helpers';
import { DataParserError } from './data_parser_error';
import { DataLink } from './index';
import { DataLinkParserInterfaces } from '../../../types/types';
import DLPv2 = DataLinkParserInterfaces.v2;
/**
 * Returns a string if the main result is not empty,
 * on top level all data should be concatenated and represented as a string.
 */
const setResult = (result: string, mainResult?: string): string => {
    return mainResult ? '' + mainResult + result : result;
};
/**
 * Root parser of a data link string,
 * it delegates the work to helper parsers.
 * Helper parsers return a result of parsing and
 * a new state of the iterator.
 */
const dataLinkParser = function* (params: DLPv2.Params): DLPv2.DataLinkParserGenerator {
    const { dataLink, data } = params;
    if (!(dataLink instanceof DataLink))
        throw new DataParserError(DataParserError.ERRORS.DATA_LINK_TYPE);
    let mainResult = '';

    try {
        for (const current of dataLink) {
            switch (current[1]) {
                case '@': // link part
                case '$': // function part
                case '{': // object part
                case '[': // array part
                case '`': // escaped by the `` symbols string part
                case '(': // expression part
                    mainResult = setResult(
                        yield* indexParser(params),
                        mainResult
                    );
                    break;
                case '\\':
                    // escaped by the \ symbol part
                    mainResult = setResult(current[2], mainResult);
                    dataLink.getNextValue();
                    break;
                case '}':
                case ']':
                case ')':
                    // unprocessed close symbols
                    throw new DataParserError(DataParserError.ERRORS.NESTING, data, dataLink);
                default:
                    // plain symbol
                    mainResult = setResult(current[1], mainResult);
                    break;
            }
        }
    } catch (Err) {
        console.error(Err);
        if (Err instanceof DataParserError) console.warn('[data]', Err.data);
        throw Err;
    }

    return mainResult;
};

export default dataLinkParser;
