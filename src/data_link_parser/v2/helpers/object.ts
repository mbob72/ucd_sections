/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataParserError } from '../data_parser_error';
import { valueParser, spaceSkipping } from './general';
import inAllowedSymbols from '../../utils/in_allowed_symbols';
import indexParser from './index';
import { DataLinkParserInterfaces } from 'types/types';
const NOT_DEFINED = Symbol('NotDefined');
/**
 * The KeyParser reads a key of the current object of the data link string.
 */
const keyParser = function* (params: DataLinkParserInterfaces.v2.Params): Generator<any, string, any> {
    const { dataLink, data } = params;
    let key = '';
    for (let current of dataLink) {
        if (current[1] === '{' || current[1] === '}')
            throw new DataParserError(DataParserError.ERRORS.NESTING);
        switch (current[1]) {
            case '(':
            case '@':
            case '$':
                // eslint-disable-next-line no-case-declarations
                const res = yield* indexParser(params);
                if (typeof res !== 'string')
                    throw new DataParserError(
                        DataParserError.ERRORS.OBJECT_KEY_STRING,
                        data,
                        dataLink
                    );
                key += res;
                current = dataLink.getCurrentValue();
                break;
            case '\\':
                current = dataLink.getNextValue();
                key += current[1];
                break;
            default:
                if (current[1] !== '/' && !inAllowedSymbols(current[1]))
                    throw new DataParserError(
                        DataParserError.ERRORS.OBJECT_KEY,
                        data,
                        dataLink
                    );
                key += current[1];
        }
        if (dataLink.isEnd())
            throw new DataParserError(DataParserError.ERRORS.NESTING);
        if (current[2] === ':' || current[2] === ' ') break;
    }
    return key;
};

/**
 * The ObjectParser reads a part of the data link string
 * that is surround by the {} symbols.
 */
const objectParser = function* (params: DataLinkParserInterfaces.v2.Params): Generator<any, Record<string | symbol, any>, any> {
    const { dataLink, data } = params;
    let current = dataLink.getCurrentValue();
    const result = {};
    let key: string | symbol = NOT_DEFINED;
    let value: string | symbol = NOT_DEFINED;
    if (current[1] !== '{') {
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR, data, dataLink);
    }

    for (current of dataLink) {
        switch (current[1]) {
            case ',':
            case '{':
                if (current[2] === ' ') {
                    spaceSkipping(params);
                    current = dataLink.getCurrentValue();
                }
                if (dataLink.isEnd())
                    throw new DataParserError(DataParserError.ERRORS.NESTING, data, dataLink);
                dataLink.getNextValue();
                key = yield* keyParser(params);
                current = dataLink.getCurrentValue();
                if (current[2] === ' ') {
                    spaceSkipping(params);
                    current = dataLink.getCurrentValue();
                }
                if (dataLink.isEnd() || current[2] !== ':')
                    throw new DataParserError(DataParserError.ERRORS.OBJECT_KEY, data, dataLink);
                break;
            case ':':
                if (current[2] === ' ') {
                    spaceSkipping(params);
                    current = dataLink.getCurrentValue();
                }
                if (
                    dataLink.isEnd() ||
                    current[2] === ',' ||
                    current[2] === '}'
                )
                    throw new DataParserError(DataParserError.ERRORS.OBJECT_VALUE, data, dataLink);
                dataLink.getNextValue();
                value = yield* valueParser(params, false);
                if (key && typeof key === 'string') {
                    // ??
                    result[key] = value;
                } else {
                    throw new DataParserError(DataParserError.ERRORS.OBJECT_KEY, data, dataLink);
                }
                current = dataLink.getCurrentValue();
                if (current[2] === ' ') {
                    spaceSkipping(params);
                    current = dataLink.getCurrentValue();
                }
                if (current[2] === ',' || current[2] === '}') break;
                throw new DataParserError(DataParserError.ERRORS.OBJECT_VALUE, data, dataLink);
            default:
                throw new DataParserError(DataParserError.ERRORS.DEFAULT, data, dataLink);
        }
        if (dataLink.isEnd())
            throw new DataParserError(DataParserError.ERRORS.NESTING, data, dataLink);
        if (current[2] === '}') {
            dataLink.getNextValue();
            break;
        }
    }

    return result;
};

export default objectParser;
