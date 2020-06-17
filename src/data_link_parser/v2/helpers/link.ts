/* eslint-disable @typescript-eslint/no-explicit-any */
import inAllowedSymbols from '../../utils/in_allowed_symbols';
import { DataParserError } from '../data_parser_error';
import indexParser from './index';
import { isObject } from '../../utils';
import { DataLinkParserInterfaces } from 'types/types';

const linkParser = function* (params: DataLinkParserInterfaces.v2.Params): Generator<any, any, any> {
    const { dataLink, data, rootData } = params;
    let current = dataLink.getCurrentValue();
    if (current[1] !== '@')
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR, data, dataLink);
    let localData = data;
    if (current[2] === '/') {
        localData = rootData;
        dataLink.getNextValue();
    }
    for (current of dataLink) {
        if (current[1] === '/' || current[1] === '@') {
            localData = yield* readLinkPart(params, localData);
        } else {
            throw new DataParserError(DataParserError.ERRORS.LINK, data, dataLink);
        }
        current = dataLink.getCurrentValue();
        if (
            dataLink.isEnd() ||
            current[2] !== '/' && !inAllowedSymbols(current[2])
        )
            break;
    }
    return localData;
};

/**
 * Reads a slash separated part of a link of the DataLink,
 * return an Object.
 */
const readLinkPart = function* (params: DataLinkParserInterfaces.v2.Params, data: Record<string, any>): Generator<any, any, any> {
    const { dataLink, defaultValue } = params;
    let part: string | number = '';
    let current = dataLink.getCurrentValue();
    if (current[1] !== '/' && current[1] !== '@') {
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR, data, dataLink);
    }
    if (dataLink.isEnd()) return data;
    dataLink.getNextValue();
    for (current of dataLink) {
        switch (current[1]) {
            case '<': // index part
                if (current[0] !== '/')
                    throw new DataParserError(
                        DataParserError.ERRORS.INDEX_PART
                    );
                return readIndexName(params, data);
            case ':': // token part
                part = readToken(params, data);
                break;
            case '$': // function part
            case '(': // expression part
                if (current[0] !== '/' && current[0] !== '@')
                    throw new DataParserError(DataParserError.ERRORS.LINK, data, dataLink);
                part = yield* indexParser({ ...params, data });
                if (typeof part !== 'string')
                    throw new DataParserError(DataParserError.ERRORS.LINK, data, dataLink);
                break;
            case '\\': // escaped symbol
                if (typeof part !== 'string')
                    throw new DataParserError(DataParserError.ERRORS.LINK, data, dataLink);
                if (current[2] === ' ')
                    throw new DataParserError(DataParserError.ERRORS.LINK, data, dataLink);
                part += current[2];
                dataLink.getNextValue();
                break;
            default:
                if (!inAllowedSymbols(current[1]))
                    throw new DataParserError(DataParserError.ERRORS.LINK, data, dataLink);
                if (typeof part !== 'string')
                    throw new DataParserError(DataParserError.ERRORS.LINK, data, dataLink);
                part += current[1];
        }
        current = dataLink.getCurrentValue();
        if (
            dataLink.isEnd() ||
            current[2] === '/' ||
            current[2] !== '\\' && !inAllowedSymbols(current[2])
        ) {
            break;
        }
    }
    if (typeof part !== 'string')
        throw new DataParserError(DataParserError.ERRORS.LINK);
    if (!isObject(data) && !Array.isArray(data)) return defaultValue; // todo: ??
    if (part && /^\d+$/.test(part) && Array.isArray(data))
        return data[Number(part)] || defaultValue;
    if (part && isObject(data))
        return typeof data[part] === 'undefined' ? defaultValue : data[part];
    return defaultValue;
};
/**
 * Reads a name of a token of the data.
 */
const readToken = (params: DataLinkParserInterfaces.v2.Params, data: Record<string, any>): string | number => {
    const { dataLink, defaultValue, tokens = {} } = params;
    let token = '';
    let current = dataLink.getCurrentValue();
    if (current[1] !== ':') {
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR, data, dataLink);
    }
    if (
        current[0] !== '/' && current[0] !== '@' ||
        dataLink.isEnd() ||
        current[2] !== '\\' && !inAllowedSymbols(current[2])
    ) {
        throw new DataParserError(DataParserError.ERRORS.LINK, data, dataLink);
    }
    dataLink.getNextValue();
    for (current of dataLink) {
        token += current[1];
        if (
            dataLink.isEnd() ||
            current[2] !== '\\' &&
                (current[2] === '/' || !inAllowedSymbols(current[2]))
        )
            break;
    }
    // the passed object of tokens is sometimes provided by the qs.parse method that created it with a null prototype.
    const key =
        token && Object.prototype.hasOwnProperty.call(tokens, token)
            ? tokens[token]
            : 0;
    if (!isObject(data) && !Array.isArray(data)) {
        console.warn('Error: The data should be an object or an array!', data, dataLink.toString());
        return defaultValue;
    }
    const res = data[key];
    return typeof res === 'undefined' ? defaultValue : res;
};
/**
 * Reads a name of data array items index.
 */
const readIndexName = (params: DataLinkParserInterfaces.v2.Params, data: Record<string, any>): Record<string, any> => {
    const { dataLink } = params;
    let indexName = '';
    let current = dataLink.getCurrentValue();
    if (!Array.isArray(data)) {
        throw new DataParserError(DataParserError.ERRORS.INDEX_NOT_ARRAY_DATA, data, dataLink);
    }
    if (current[1] !== '<') {
        throw new DataParserError(DataParserError.ERRORS.ITERATOR_ERROR, data, dataLink);
    }
    if (current[2] === '>' || current[0] !== '/') {
        throw new DataParserError(DataParserError.ERRORS.INDEX_EMPTY, data, dataLink);
    }
    dataLink.getNextValue();
    for (current of dataLink) {
        if (inAllowedSymbols(current[1])) {
            indexName += current[1];
        } else {
            throw new DataParserError(DataParserError.ERRORS.INDEX_NAME, data, dataLink);
        }
        if (current[2] === '>') break;
    }
    current = dataLink.getNextValue();
    if (current[2] === '/')
        throw new DataParserError(DataParserError.ERRORS.INDEX_LAST, data, dataLink);
    if (inAllowedSymbols(current[2]))
        throw new DataParserError(DataParserError.ERRORS.INDEX_PART, data, dataLink);
    for (const i in data) data[i][indexName] = i;
    return data;
};

export default linkParser;
