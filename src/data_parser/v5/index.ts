/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable key-spacing,indent */
import dataLinkParser from '../../data_link_parser/v2';
import getDataLink from './utils/data_link_cache';
import { isObject } from '../../data_link_parser/utils';
import runAsyncGenerator from '../utils/run_async_generator';
import { DataParserInterfaces } from 'types/types';
import DataParserV5 = DataParserInterfaces.v5;

/**
 * Parsing mode.
 * In the core mode only fields /^_.+?_$/ must be parsed.
 * In the user mode must be parsed all fields expect core's fields.
 * In the full mode all types of fields must be parsed.
 * In the shallow mode only string values must be parsed (top level of the current object or array in the passed dataLink).
 * In the deep mode all values must be parsed.
 */
const MODE = {
    USER_SHALLOW: 0b1001,
    CORE_SHALLOW: 0b1010,
    FULL_SHALLOW: 0b1011,
    USER_DEEP: 0b1101,
    CORE_DEEP: 0b1110,
    FULL_DEEP: 0b1111,
};

/**
 * Asynchronous data parser.
 */
function asyncDataParser({ schema, data, rootData, defaultData, functions, tokens, mode = MODE.FULL_DEEP }: DataParserV5.EntryParams): Promise<any> {
    return new Promise((resolve, reject) => {
        if (!rootData) rootData = data;
        const iterator = switcher({
            dataLink: schema,
            data,
            rootData,
            functions,
            mode,
            tokens,
            defaultData
        });
        runAsyncGenerator(iterator, resolve, reject);
    });
}

/**
 * Synchronous data parser. Returns only final result of the iteration.
 */
function syncDataParser({ schema, data, rootData, defaultData, functions, tokens, mode = MODE.FULL_DEEP }: DataParserV5.EntryParams): any {
    if (!rootData) rootData = data;
    const generator = switcher({
        dataLink: schema,
        data,
        rootData,
        functions,
        mode,
        tokens,
        defaultData
    });
    let result: any;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const { done, value } = generator.next(result);
        result = value;
        if (done) return value;
    }
}

/**
 * Data parser as a generator, client may process each yielded value.
 */
function* genDataParser({ schema, data, rootData, defaultData, functions, tokens, mode = MODE.FULL_DEEP }: DataParserV5.EntryParams): Generator<any, any, any> {
    if (!rootData) rootData = data;
    return yield* switcher({
        dataLink: schema,
        data,
        rootData,
        functions,
        mode,
        tokens,
        defaultData
    });
}

function* switcher(params: DataParserV5.ParserParamsAny): Generator<any, any, any> {
    const { dataLink, mode } = params;
    // shallow or deep mode
    const modeCode = mode & 0b1100 || 0b1100;
    if (typeof dataLink === 'string') {
        return yield* dataLinkParser({ ...params, dataLink: getDataLink(dataLink) });
    } else if (isObject(dataLink)) {
        if (modeCode === 0b1000) return dataLink;
        return yield* objectParser(<DataParserV5.ParserParamsObject>params);
    } else if (Array.isArray(dataLink)) {
        if (modeCode === 0b1000) return dataLink;
        return yield* arrayParser(<DataParserV5.ParserParamsArray>params);
    } else if (typeof dataLink === 'undefined') {
        console.warn('[warning] dataParserV5: dataLink is undefined.');
        return void 0;
    } else {
        return dataLink;
    }
}

function* arrayParser(params: DataParserV5.ParserParamsArray): Generator<any, any, any> {
    const { dataLink } = params;
    const arr = new Array(dataLink.length);
    for (let i = 0; i < dataLink.length; i++) {
        arr[i] = yield* switcher(<DataParserV5.ParserParamsAny>{ ...params, dataLink: dataLink[i] });
    }
    return arr;
}

function* objectParser(params: DataParserV5.ParserParamsObject): Generator<any, any, any> {
    const { dataLink, mode } = params;
    // user, core or full mode
    const modeCode = mode & 3 || 3;
    let { data } = params;
    // _computations_ must be skipped on this step.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _dataLink_, _computations_, _template_, ...others } = dataLink;
    if (_dataLink_) {
        data = yield* switcher({ ...params, dataLink: _dataLink_, mode: MODE.USER_DEEP });
    }
    if (_template_) {
        if (!Array.isArray(data))
            throw new Error('[error] dataParserV5: data must be an array.');
        const a: Array<any> = [];
        for (const subData of data) {
            a.push(yield* switcher(<DataParserV5.ParserParamsAny>{ ...params, dataLink: _template_, data: subData, }));
        }
        return a;
    }
    // todo: add a functionParser: { _function_: "", _params_: [...] } to simplify complex expressions in schemas.
    const result = {};
    for (const key of Object.getOwnPropertyNames(others)) {
        if (modeCode !== 3) {
            // not full mode
            if (key[0] === '_' && key[key.length - 1] === '_' && modeCode === 1)
                continue; // core's fields on user mode.
            if (
                (key[0] !== '_' || key[key.length - 1] === '_') &&
                modeCode === 2
            )
                continue; // user's field on core mode.
        }
        const parsedKey = yield* switcher({ ...params, dataLink: key, data });
        if (typeof parsedKey !== 'string')
            throw new Error(
                '[error] dataParserV5: parsedKey must be a string.'
            );
        result[parsedKey] = yield* switcher({ ...params, dataLink: dataLink[key], data });
    }
    return result;
}

export { asyncDataParser, syncDataParser, genDataParser, MODE };
