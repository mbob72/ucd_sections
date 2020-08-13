/* eslint-disable @typescript-eslint/no-explicit-any */
import { isEmpty, isFunction, strictlyIsObject } from '../../utils';
import {
    isDataLink,
    isFunctionCall,
    isLink,
    isRootLink,
} from '../../data_link_parser/utils';
import getDataLink from '../utils/data_link_cache';
import * as renderFunctions from '../../computations/functions';
import { syncDataParser } from '../v5';
import IncrementGenerator from '../utils/increment_generator';
import deepMerge from '../../utils/deep_merge';
import { DataParserInterfaces, SchemaInterfaces } from '../../../types/types';
import DataParserV4 = DataParserInterfaces.v4.Preprocessor;
import { ProcessedObject } from 'utils/types';

// todo: this file must be removed. All schemas should be parsed inside the sections logic. Schema pre-processing is very difficult for maintenance.

const FIELDS_MODE = 'fieldsMode';
const SECTIONS_MODE = 'sectionsMode';

/**
 * todo: if there is a link like @key/0/key (contains an array's index) it should be replaced by a link with objectId instead of array index.
 * todo: add validations processing, they must be written into the context under a symbol key.
 *  OnSubmit handler will read all symbol-keyed validators and call them.
 * todo: the context should be a deep copy of the source data and must be wrapped in a Proxy to imitate a flat hashMap object.
 */

const DATA_OBJECT_ID = Symbol.for('_objectId_');
const objectIdGenerator = new IncrementGenerator();
const templateIndexNames: Array<string> = [];

// warning: This dataParser is a schema preprocessor that prepares schema and data for processing in the sections/v4 only.

/**
 * Entry point of the dataParser.
 */
const dataParser = (params: DataParserV4.ParserParamsEntry): { schema: Record<string, any>, context: Record<string | symbol, any> } => {
    params.renderFunctions =
        params.renderFunctions || dataParser.renderFunctions || {};
    let { data } = params;
    if (!data) data = {};
    let { rootData, dataPath, schemaPath } = params;
    if (!rootData) rootData = data;
    if (!dataPath) {
        dataPath = '@/';
    } else if (typeof dataPath !== 'string' || !/^@\//.test(dataPath))
        throw new Error(
            'DataParserV4: dataPath must be a string and starts with \'@/\' symbols.'
        );
    if (!schemaPath) {
        schemaPath = [];
    } else if (!Array.isArray(schemaPath))
        throw new Error(
            'DataParserV4: schemaPath must be a string and starts with \'#/\' symbols.'
        );
    const context = {};
    const parsed = switcher(<DataParserV4.ParserParamsAny>{
        ...params,
        rootData,
        dataPath,
        schemaPath,
        context,
    });
    return { schema: parsed, context };
};
dataParser.renderFunctions = renderFunctions;

/**
 * Calls a function corresponding the passed dataLink type.
 */
const switcher = (params: DataParserV4.ParserParamsAny): any => {
    const { dataLink, data } = params;
    // todo: the next line should be refactored.
    if (dataLink === void 0) return data;
    // warning: the next line has been commented. It may cause errors.
    // if (isEmpty(data)) return null
    if (strictlyIsObject(dataLink)) {
        const { _template_ } = <SchemaInterfaces.GeneralSchemaObjectInterface>dataLink;
        if (_template_) return templateParser(<DataParserV4.ParserParamsObject>params);
        return objectParser(<DataParserV4.ParserParamsObject>params);
    }
    if (Array.isArray(dataLink)) return arrayParser(<DataParserV4.ParserParamsArray>params);
    if (typeof dataLink === 'string' && dataLink && isDataLink(dataLink))
        return stringParser(<DataParserV4.ParserParamsString>params);
    return dataLink;
};

/**
 * Parses a schema array.
 */
const arrayParser = (params: DataParserV4.ParserParamsArray, mode: string | null = null) => {
    const { dataLink } = params;
    if (!Array.isArray(dataLink))
        throw new Error('DataParserV4: dataLink should be an array');
    const arr = new Array(dataLink.length);
    for (let i = 0; i < dataLink.length; i++) {
        if (strictlyIsObject(dataLink[i])) {
            dataLink[i] = Object.create(
                {},
                <PropertyDescriptorMap>{
                    ...Object.getOwnPropertyDescriptors(<SchemaInterfaces.GeneralSchemaObjectInterface>dataLink[i]),
                    _objectId_: {
                        value: objectIdGenerator.get(),
                        writable: false,
                        enumerable: false,
                    },
                    _index_: {
                        value: i,
                        writable: false,
                        enumerable: false,
                    },
                }
            );
        }
        switch (mode) {
            case FIELDS_MODE: {
                if (!strictlyIsObject(dataLink[i]))
                    throw new Error(
                        'DataLinkParserV4: array item must be an object (fields mode).'
                    );
                arr[i] = fieldParser(<DataParserV4.ParserParamsObject>{ ...params, dataLink: dataLink[i] });
                break;
            }
            case SECTIONS_MODE: {
                if (!strictlyIsObject(dataLink[i]))
                    throw new Error(
                        'DataLinkParserV4: array item must be an object (sections mode).'
                    );
                arr[i] = objectParser(<DataParserV4.ParserParamsObject>{ ...params, dataLink: dataLink[i] });
                break;
            }
            default:
                arr[i] = switcher(<DataParserV4.ParserParamsAny>{ ...params, dataLink: dataLink[i] });
        }
    }
    return arr;
};
/**
 * Parses an object,
 * processes some special cases such as _sections_ and _fields_.
 */
const objectParser = (params: DataParserV4.ParserParamsObject): Record<string, any> => {
    const { dataLink }: { dataLink: SchemaInterfaces.GeneralSchemaObjectInterface & { _defaultData_?: Record<string, any>, _objectId_?: number } } = params;
    let { dataPath, rootData, data } = params;
    const {
        _sections_,
        _fields_,
        _dataLink_,
        _defaultData_,
        _objectId_,
        ...others
    } = dataLink;
    if (_defaultData_) {
        const newData = isEmpty(data)
            ? _defaultData_
            : deepMerge(_defaultData_, <ProcessedObject>data);
        if (data === rootData) {
            rootData = newData;
        }
        data = newData;
    }
    if (_dataLink_)
        ({ data, dataPath } = parseDataLink({
            ...params,
            data,
            rootData,
            dataLink: _dataLink_,
        }, true));
    const result = Object.create(
        {},
        <PropertyDescriptorMap>{
            ...Object.getOwnPropertyDescriptors(others),
            _objectId_: {
                value: _objectId_ || objectIdGenerator.get(),
                writable: false,
                enumerable: false,
            },
        }
    );
    if (_sections_) {
        if (strictlyIsObject(_sections_)) {
            result._sections_ = templateParser(
                <DataParserV4.ParserParamsObject>{ ...params, dataLink: _sections_, data, rootData, dataPath },
                SECTIONS_MODE
            );
        } else if (Array.isArray(_sections_)) {
            result._sections_ = arrayParser(
                <DataParserV4.ParserParamsArray>{ ...params, dataLink: _sections_, data, rootData, dataPath },
                SECTIONS_MODE
            );
        } else
            throw new Error(
                'DataParserV4: _sections_ must be an array or an object.'
            );
    }
    if (_fields_) {
        if (strictlyIsObject(_fields_)) {
            result._fields_ = templateParser(
                <DataParserV4.ParserParamsObject>{ ...params, dataLink: _fields_, data, rootData, dataPath },
                FIELDS_MODE
            );
        } else if (Array.isArray(_fields_)) {
            result._fields_ = arrayParser(
                <DataParserV4.ParserParamsArray>{ ...params, dataLink: _fields_, data, rootData, dataPath },
                FIELDS_MODE
            );
        } else
            throw new Error(
                'DataParserV4: _fields_ must be an array or an object.'
            );
    }
    for (const key of Object.getOwnPropertyNames(others)) {
        result[key] = switcher({
            ...params,
            dataLink: others[key],
            data,
            rootData,
            dataPath,
        });
    }
    return result;
};

/**
 * Parses a field object.
 */
const fieldParser = (params: DataParserV4.ParserParamsObject): Record<string, any> => {
    const { dataLink, context } = params;
    const {
        _value_,
        _objectId_,
        _computations_,
        _sections_,
        _fields_,
        ...others
    } = <SchemaInterfaces.GeneralSchemaObjectInterface & { _objectId_?: number }>dataLink;
    if (_sections_ || _fields_)
        throw new Error(
            'DataParserV4: field must be the end point object of a schema.'
        );
    const result = Object.create(
        {},
        <PropertyDescriptorMap>{
            ...Object.getOwnPropertyDescriptors(others),
            _objectId_: {
                value: _objectId_ || objectIdGenerator.get(),
                writable: false,
                enumerable: false,
            },
        }
    );
    for (const key of Object.getOwnPropertyNames(others)) {
        result[key] = switcher({ ...params, dataLink: dataLink[key] });
    }
    if (_value_) {
        if (typeof _value_ !== 'string')
            throw new Error(
                'DataParserV4: _value_ must be a syntax string or a simple string.'
            );
        if (isDataLink(_value_)) {
            // if (!isLink(_value_) && !isFunctionCall(_value_))
            //     throw new Error(
            //         'DataParserV4: _value_ of field must be a simple link or a function call.'
            //     );
            // _defaultValue_ field should contain a primitive value. todo: in future, it might be a dynamically evaluated value
            result['_value_'] = stringParser(
                { ...params, dataLink: _value_ }
            );
        } else result['_value_'] = _value_;
    }
    // Adds a service object under a Symbol key that is related with the current schema field object.
    context[Symbol.for(result._objectId_)] = {};
    if (strictlyIsObject(_computations_)) {
        if (!isFunction(_value_)) {
            result._computations_ = computationsParser(<DataParserV4.ParserParamsComputations>{
                ...params,
                dataLink: _computations_,
            });
        } else
            throw new Error(
                'DataParserV4: Render function in _value_ is allowed only in passive field.'
            );
    }
    return result;
};
/**
 * Processes _computations_ object.
 */
const computationsParser = (params: DataParserV4.ParserParamsComputations) => {
    const { dataLink } = params;
    const {
        _handlers_ = {},
        _after_ = [],
    } = dataLink;
    const eventTypes = Object.getOwnPropertyNames(_handlers_);
    if (!eventTypes.length) return {};
    const computations: { _after_: Array<string>, _handlers_: Record<string, Array<string | Record<string, any>>> } = {
        _handlers_: {},
        _after_: [],
    };
    for (const e of eventTypes) {
        if (Array.isArray(_handlers_[e]) && _handlers_[e].length) {
            computations._handlers_[e] = actionsParser({
                ...params,
                dataLink: _handlers_[e],
            });
        } else if (
            typeof _handlers_[e] === 'string' &&
            isFunctionCall(_handlers_[e])
        ) {
            computations._handlers_[e] = stringParser({
                ...params,
                dataLink: _handlers_[e],
            });
        } else
            throw new Error(
                'DataParserV4: List of computations must be a non empty array, an object or a renderFunction string.'
            );
    }
    if (Array.isArray(_after_) && _after_.length) {
        computations._after_ = <Array<string>>actionsParser({ ...params, dataLink: _after_ });
    } else if (typeof _after_ === 'string' && isFunctionCall(_after_)) {
        computations._after_ = [ stringParser({ ...params, dataLink: _after_ }) ];
    } else if (!Array.isArray(_after_))
        throw new Error(
            'DataParserV4: Computation must be a renderFunction string (_after_).'
        );

    return computations;
};

/**
 * Processes passed list of renderFunction strings,
 * if they contains a links they are replaced by context's keys.
 */
const actionsParser = (params: DataParserV4.ParserParamsArray): Array<string | Record<string, any>> => {
    const { dataLink } = params;
    const actions: Array<string | Record<string, any>> = [];
    for (const action of dataLink) {
        // if (typeof action !== 'string' || !isFunctionCall(action)) throw new Error('DataParserV4: Computation must be a renderFunction string.')
        if (strictlyIsObject(action)) {
            actions.push(objectParser(<DataParserV4.ParserParamsObject>{ ...params, dataLink: <Record<string, any>>action }));
        } else if (typeof action === 'string') {
            actions.push(stringParser({ ...params, dataLink: action }));
        } else
            throw new Error(
                'DataParserV4: action must be a dataLink string or a value object.'
            );
    }
    return actions;
};

/**
 * Resolves a schema template,
 * returns an array of schema objects with modified syntax strings.
 * Schema objects don't contain any data but only links to data in the context.
 */
const templateParser = (params: DataParserV4.ParserParamsObject, mode: string | null = null) => {
    const { dataLink, rootData, context, meta, tokens = {} } = params;
    const { _template_, _dataLink_ } = dataLink;
    if (!_template_) {
        throw new Error('DataParserV4: schema template should be provided.');
    }
    if (
        (mode === SECTIONS_MODE || mode === FIELDS_MODE) &&
        !strictlyIsObject(_template_)
    ) {
        throw new Error(`DataParserV4: template must be an object (${mode}).`);
    }
    if (!_dataLink_ || typeof _dataLink_ !== 'string' || !isLink(_dataLink_)) {
        throw new Error(
            'DataParserV4: template must be provided with a _dataLink_ field and it should be a link.'
        );
    }
    if (_dataLink_.endsWith('>')) {
        const index = <string>_dataLink_.split('/').pop();
        const indexName = index.substring(1, index.length - 1);
        templateIndexNames.push(indexName);
    }
    const { data, dataPath } = parseDataLink(
        { ...params, dataLink: _dataLink_ },
        true
    ); // todo: may be the dataLink's data should be placed in the context...
    if (!Array.isArray(data)) {
        throw new Error('DataParserV4: data for template must be an array.');
    }
    if (!Object.prototype.hasOwnProperty.call(context, Symbol.for(dataPath))) {
        // Save the template schema and the current dataPath for item adding functionality.
        // It is written under a Symbol key to prevent processing on submitting data.
        context[Symbol.for(dataPath)] = {
            dataPath,
            schemaTemplate: _template_,
        };
    }
    const result: Array<any> = [];
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (!strictlyIsObject(item) && !Array.isArray(item)) {
            throw new Error(
                'DataParserV4: each template data item must be an object or an array.'
            );
        }
        const objectId = objectIdGenerator.get();
        // The identifier is written to the data as a symbol-keyed value to prevent any processing this value on submit event.
        item[DATA_OBJECT_ID] = objectId;
        let newDataLink;
        if (strictlyIsObject(_template_)) {
            newDataLink = Object.create(
                {},
                <PropertyDescriptorMap>{
                    ...Object.getOwnPropertyDescriptors(<SchemaInterfaces.GeneralSchemaObjectInterface>_template_),
                    _objectId_: {
                        value: objectId,
                        writable: false,
                        enumerable: false,
                    },
                    _index_: {
                        value: i,
                        writable: false,
                        enumerable: false,
                    },
                }
            );
        } else newDataLink = _template_;
        params = {
            ...params,
            dataLink: newDataLink,
            data: item,
            rootData,
            dataPath: mergeLinks({ dataPath, middle: objectId, link: '@' }),
            meta: {
                ...meta,
                templateDataLink: dataPath,
                currentTemplateId: objectId,
            },
            tokens: { ...tokens, ...item },
        };
        switch (mode) {
            case FIELDS_MODE:
                result.push(fieldParser(params));
                break;
            case SECTIONS_MODE:
                result.push(objectParser(params));
                break;
            default:
                result.push(switcher(params));
        }
    }
    return result;
};

const escapedContexKeyRegex = new RegExp('(?<!\\\\)([@/()$])', 'g');
/**
 * Replaces all links to context keys,
 * reads values of all links from data and write them to the context.
 */
const stringParser = (params: DataParserV4.ParserParamsString): any => {
    const {
        data,
        rootData,
        dataPath,
        context,
        tokens,
        renderFunctions,
    } = params;
    let { dataLink } = params;
    if (!isDataLink(dataLink))
        throw new Error('DataParserV4: dataLink must be a syntax string.');
    const dataLinkInstance = getDataLink(dataLink);
    const links = dataLinkInstance.containsLinks()
        ? dataLinkInstance.extractLinks()
        : [];
    if (links && links.length) {
        for (let link of links) {
            const value = syncDataParser(<DataParserInterfaces.v5.EntryParams>{
                schema: link,
                data,
                rootData,
                tokens,
                functions: renderFunctions,
            });
            if (/[/@]:\w+?/.test(link)) {
                const newLink = replaceTokens(
                    link,
                    tokens,
                    link.startsWith('@/') ? rootData : data,
                    dataPath
                );
                dataLink = dataLink.replace(link, newLink);
                link = newLink;
            }
            const contextKey = isRootLink(link)
                ? link
                : mergeLinks(<{ dataPath: string, link: string }>{ dataPath, link });
            if (value !== undefined) context[contextKey] = value;
            const escapedContextKey = contextKey.replace(
                escapedContexKeyRegex,
                '\\$1'
            );
            dataLink = dataLink.replace(link, '@' + escapedContextKey);
        }
    }
    return dataLink;
};

const replaceTokens = (link, tokens, rootData, dataPath) => {
    const parts = link.substring(1).split('/').filter(Boolean);
    const newLink = getNewParts(parts, tokens, rootData).join('/');
    if (link.startsWith('@/')) return '@/' + newLink;
    return mergeLinks({ dataPath, link: '@' + newLink });
};

const getNewParts = (parts: Array<string>, tokens: Record<string, string | number>, data) => {
    const newParts: Array<string> = [];
    parts.reduce(
        (acc, part: string | number) => {
            if (!acc.data) return acc;
            if ((<string>part).startsWith(':')) {
                const token = (<string>part).substring(1);
                part = tokens[token];
                acc.data = acc.data[part];
                if (templateIndexNames.includes(token)) {
                    if (!Object.prototype.hasOwnProperty.call(acc.data, DATA_OBJECT_ID))
                        throw new Error(
                            'DataParserV4: object must contain _objectId_ param.'
                        );
                    acc.newParts.push(acc.data[DATA_OBJECT_ID]);
                } else acc.newParts.push(<string>part);
                return acc;
            }
            acc.data = acc.data[part];
            acc.newParts.push(<string>part);
            return acc;
        },
        { newParts, data }
    );
    return newParts;
};

/**
 * Creates an absolute link to data,
 * returned string that contains escaped the dog symbol and slashes.
 */
const mergeLinks = ({ dataPath, link = '', middle }: { dataPath: string, link: string, middle?: string | number }): string => {
    if (isRootLink(link)) return link;
    if (!dataPath) dataPath = '@/';
    return (
        dataPath +
        '/' +
        (middle ? middle + '/' : '') +
        link.substring(1)
    ).replace(/\/{2,}/, '/');
};

/**
 * Reads _dataLink_ string that overrides the data context in a schema.
 */
const parseDataLink = (params: DataParserV4.ParserParamsString, shouldBeAdded = false) => {
    const { dataLink, rootData, context, renderFunctions, tokens } = params;
    let { data, dataPath } = params;
    if (typeof dataLink !== 'string' || !isLink(dataLink))
        throw new Error('DataParserV4: _dataLink_ must be a simple Link.');
    let pureDataLink = /<[a-zA-Z0-9_]+>$/.test(dataLink)
        ? dataLink.replace(/\/<.+>$/, '')
        : dataLink;
    pureDataLink = syncDataParser(<DataParserInterfaces.v5.EntryParams>{ schema: pureDataLink.substring(1), data, rootData, functions: renderFunctions, tokens }); // resolve dataLink's dynamic parts
    dataPath = mergeLinks(<{ dataPath: string, link: string }>{ dataPath, link: `@${pureDataLink}` });
    data = syncDataParser(<DataParserInterfaces.v5.EntryParams>{
        schema: dataLink,
        data,
        rootData,
        functions: renderFunctions,
        tokens,
    });
    if (shouldBeAdded && !Object.prototype.hasOwnProperty.call(context, dataPath))
        context[`@${pureDataLink}`] = data;
    return { dataPath, data };
};

/**
 * Returns a parsed schema based on the passed schema template and adds to the context new values.
 */
export const templateAddInfo = ({ dataPath = '@/', template }: { dataPath: string, template: any }): any => {
    if (!dataPath || typeof dataPath !== 'string' || !isLink(dataPath))
        throw new Error('DataParserV4: dataPath must be a string.');
    if (!strictlyIsObject(template))
        throw new Error('DataParserV4: template must be an object.');
    return dataParser(<DataParserV4.ParserParamsEntry>{ dataLink: template, dataPath, data: {} });
};
/**
 * Returns a list of keys of the main context that must be deleted.
 */
export const templateDeleteInfo = (dataLink: string, context: Record<string | symbol, any>): Array<string> => {
    // todo: should return keys for deletion by a computation function. Now it changes the context directly.
    if (!dataLink || typeof dataLink !== 'string' || !isLink(dataLink))
        return [];
    return Object.keys(context).filter((item) => item.startsWith(dataLink));
};

export { dataParser };
export default dataParser;
