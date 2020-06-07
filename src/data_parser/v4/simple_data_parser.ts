/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Type definition for IDE.
 * @typedef {Object} Params
 * @property {Object|Array|string} dataLink
 * @property {Object|Array} data
 * @property {Object|Array} rootData
 * @property {Object} renderFunctions
 */
import { isEmpty, strictlyIsObject } from '../../utils';
import dataLinkParser from '../../data_link_parser/v1';
import getDataLink from '../utils/data_link_cache';
import { isDataLink } from '../../data_link_parser/utils';
import { DataParserInterfaces, SchemaCallbackCollection, SchemaInterfaces } from 'types/types';
import DataParserV4 = DataParserInterfaces.v4;

/**
 * This parser parses only fields with a syntax string.
 * It is a standalone parser.
 * @param schema
 * @param data
 * @param renderFunctions
 */
const parseSchemaFields = (schema: SchemaInterfaces.GeneralSchemaObjectInterface, data: Record<string, any>, renderFunctions: SchemaCallbackCollection): Record<string, any> => {
    const schm = { ...schema };
    for (const key of Object.getOwnPropertyNames(schm)) {
        if (typeof schm[key] !== 'string' || !isDataLink(schm[key])) continue;
        schm[key] = dataLinkParser({
            dataLink: getDataLink(schm[key]),
            data,
            renderFunctions,
        });
    }
    return schm;
};

/**
 * Entry point of simpleDataParser,
 * it parses the passed dataLink object recursively.
 * This parser can't parse the template structure
 * it expects a simple structure with arrays and objects with dataLink strings inside.
 * @param {{renderFunctions: *, data: *, dataLink: *}} params
 * @returns {*}
 */
const simpleDataParser = (params: DataParserV4.ParserParamsAny): any => {
    const { data } = params;
    let { rootData } = params;
    if (!rootData) rootData = data;
    return switcher({ ...params, rootData });
};

/**
 * Calls a function corresponding the passed dataLink type.
 * @param {Params} params
 * @returns {any[]|null|Array|*}
 */
const switcher = (params: DataParserV4.ParserParamsAny): any => {
    const { dataLink, data } = params;
    if (dataLink === void 0) return data;
    if (isEmpty(data)) return null;
    if (strictlyIsObject(dataLink)) return objectParser(<DataParserV4.ParserParamsObject>params);
    if (Array.isArray(dataLink)) return arrayParser(<DataParserV4.ParserParamsArray>params);
    if (typeof dataLink === 'string')
        return dataLinkParser({ ...params, dataLink: getDataLink(dataLink) });
    return dataLink;
};

/**
 * Parses arrays.
 * @param {Params} params
 * @return {any[]}
 */
const arrayParser = (params: DataParserV4.ParserParamsArray): Array<any> => {
    /** @type {Array<Object>} dataLink */
    const { dataLink } = params;
    const arr = new Array(dataLink.length);
    for (let i = 0; i < dataLink.length; i++) {
        arr[i] = switcher({ ...params, dataLink: dataLink[i] });
    }
    return arr;
};
/**
 * Parses objects.
 * @param {Params} params
 * @return Object
 */
const objectParser = (params: DataParserV4.ParserParamsObject): Record<string, any> => {
    const { dataLink } = params;
    let { data } = params;
    // these fields must be skipped they are only for system processing.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _dataLink_, _computations_, _template_, _sections_, _fields_, ...others } = dataLink;
    if (_dataLink_ && typeof _dataLink_ === 'string')
        data = dataLinkParser({ ...params, dataLink: _dataLink_ });
    const result = {};
    for (const key of Object.getOwnPropertyNames(others)) {
        result[parseKey({ ...params, dataLink: key })] = switcher({
            ...params,
            dataLink: others[key],
            data,
        });
    }
    return result;
};

const parseKey = (params:DataParserV4.ParserParamsString): any => {
    let { dataLink } = params;
    if (isDataLink(dataLink)) {
        dataLink = dataLinkParser({
            ...params,
            dataLink: getDataLink(dataLink),
        });
        if (typeof dataLink !== 'string')
            throw new Error(
                `[error] simpleDataParser: key should be a string! A "${typeof dataLink}" is given.`
            );
    }
    return dataLink;
};

export { simpleDataParser, parseSchemaFields };
