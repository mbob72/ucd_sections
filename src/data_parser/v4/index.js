import { isEmpty, isFunction, strictlyIsObject } from '../../utils'
import { isDataLink, isFunctionCall, isLink, isRootLink } from '../../data_link_parser/utils'
import getDataLink from '../utils/data_link_cache'
import * as renderFunctions from '../../computations/index'
import { linkParser } from '../../data_link_parser/v1/helpers'
import incrementGenerator from '../utils/increment_generator'
import deepMerge from '../../utils/deep_merge'

// todo: this file must be removed. All schemas should be parsed inside the sections logic. Schema pre-processing is very difficult for maintenance.

const FIELDS_MODE = 'fieldsMode'
const SECTIONS_MODE = 'sectionsMode'

/**
 * todo: if there is a link like @key/0/key (contains an array's index) it should be replaced by a link with objectId instead of array index.
 * todo: add validations processing, they must be written into the context under a symbol key.
 *  OnSubmit handler will read all symbol-keyed validators and call them.
 * todo: the context should be a deep copy of the source data and must be wrapped in a Proxy to imitate a flat hashMap object.
 */

const DATA_OBJECT_ID = Symbol.for('_objectId_')
const objectIdGenerator = incrementGenerator()
const templateIndexNames = []

/**
 * Type definition for IDE.
 * @typedef {Object} Params
 * @property {Object|Array|string} dataLink
 * @property {Object|Array} data
 * @property {string} [dataPath]
 * @property {Object} [renderFunctions]
 */
/**
 * Entry point of the dataParser.
 * @param {Params} params
 * @returns {{ schema: {Object}, context: {Object} }}
 */
const dataParser = (params) => {
    params.renderFunctions = params.renderFunctions || dataParser.renderFunctions || {}
    let { data } = params
    if (!data) data = {}
    let { rootData, dataPath, schemaPath } = params
    if (!rootData) rootData = data
    if (!dataPath) {
        dataPath = '@/'
    } else if (typeof dataPath !== 'string' || !/^@\//.test(dataPath)) throw new Error('DataParserV4: dataPath must be a string and starts with \'@/\' symbols.')
    if (!schemaPath) {
        schemaPath = []
    } else if (!Array.isArray(schemaPath)) throw new Error('DataParserV4: schemaPath must be a string and starts with \'#/\' symbols.')
    const context = {}
    const parsed = switcher({ ...params, rootData, dataPath, schemaPath, context })
    return { schema: parsed, context }
}
dataParser.renderFunctions = renderFunctions

/**
 * Calls a function corresponding the passed dataLink type.
 * @param {Params} params
 * @returns {any[]|null|Array|*}
 */
const switcher = (params) => {
    const { dataLink, data } = params
    // todo: the next line should be refactored.
    if (dataLink === void 0) return data
    // warning: the next line has been commented. It may cause errors.
    // if (isEmpty(data)) return null
    if (strictlyIsObject(dataLink)) {
        if ('_template_' in dataLink) return templateParser(params)
        return objectParser(params)
    }
    if (Array.isArray(dataLink)) return arrayParser(params)
    if (typeof dataLink === 'string' && dataLink && isDataLink(dataLink)) return stringParser(params)
    return dataLink
}

/**
 * Parses a schema array.
 * @param {Params} params
 * @param {string|null} mode
 * @return {any[]}
 */
const arrayParser = (params, mode = null) => {
    const { dataLink } = params
    if (!Array.isArray(dataLink)) throw new Error('DataParserV4: dataLink should be an array')
    const arr = new Array(dataLink.length)
    for (let i = 0; i < dataLink.length; i++) {
        if (strictlyIsObject(dataLink[i])) {
            dataLink[i] = Object.create({}, {
                ...Object.getOwnPropertyDescriptors(dataLink[i]),
                _objectId_: {
                    value: objectIdGenerator.get(),
                    writable: false,
                    enumerable: false
                },
                _index_: {
                    value: i,
                    writable: false,
                    enumerable: false
                }
            })
        }
        switch (mode) {
            case FIELDS_MODE: {
                if (!strictlyIsObject(dataLink[i])) throw new Error('DataLinkParserV4: array item must be an object (fields mode).')
                arr[i] = fieldParser({ ...params, dataLink: dataLink[i] })
                break
            }
            case SECTIONS_MODE: {
                if (!strictlyIsObject(dataLink[i])) throw new Error('DataLinkParserV4: array item must be an object (sections mode).')
                arr[i] = objectParser({ ...params, dataLink: dataLink[i] })
                break
            }
            default:
                arr[i] = switcher({ ...params, dataLink: dataLink[i] })
        }
    }
    return arr
}
/**
 * Parses an object,
 * processes some special cases such as _sections_ and _fields_.
 * @param {Params} params
 * @return Object
 */
const objectParser = (params) => {
    const { dataLink } = params
    let { dataPath, rootData, data } = params
    const { _sections_, _fields_, _dataLink_, _defaultData_, _objectId_, ...others } = dataLink
    if (_defaultData_) {
        const newData = isEmpty(data) ? _defaultData_ : deepMerge(_defaultData_, data)
        if (data === rootData) {
            rootData = newData
        }
        data = newData
    }
    if (_dataLink_) ({ data, dataPath } = parseDataLink({ ...params, data, rootData, dataLink: _dataLink_ }))
    const result = Object.create({}, {
        ...Object.getOwnPropertyDescriptors(others),
        _objectId_: {
            value: _objectId_ || objectIdGenerator.get(),
            writable: false,
            enumerable: false
        }
    })
    if (_sections_) {
        if (strictlyIsObject(_sections_)) {
            result._sections_ = templateParser({ ...params, dataLink: _sections_, data, rootData, dataPath }, SECTIONS_MODE)
        } else if (Array.isArray(_sections_)) {
            result._sections_ = arrayParser({ ...params, dataLink: _sections_, data, rootData, dataPath }, SECTIONS_MODE)
        } else throw new Error('DataParserV4: _sections_ must be an array or an object.')
    }
    if (_fields_) {
        if (strictlyIsObject(_fields_)) {
            result._fields_ = templateParser({ ...params, dataLink: _fields_, data, rootData, dataPath }, FIELDS_MODE)
        } else if (Array.isArray(_fields_)) {
            result._fields_ = arrayParser({ ...params, dataLink: _fields_, data, rootData, dataPath }, FIELDS_MODE)
        } else throw new Error('DataParserV4: _fields_ must be an array or an object.')
    }
    for (const key of Object.getOwnPropertyNames(others)) {
        result[key] = switcher({ ...params, dataLink: others[key], data, rootData, dataPath })
    }
    return result
}

/**
 * Parses a field object.
 * @param {Params} params
 * @return {Object}
 */
const fieldParser = (params) => {
    const { dataLink, context } = params
    const { _value_, _defaultValue_, _objectId_, _computations_, _sections_, _fields_, ...others } = dataLink
    if (_sections_ || _fields_) throw new Error('DataParserV4: field must be the end point object of a schema.')
    const result = Object.create({}, {
        ...Object.getOwnPropertyDescriptors(others),
        _objectId_: {
            value: _objectId_ || objectIdGenerator.get(),
            writable: false,
            enumerable: false
        }
    })
    for (const key of Object.getOwnPropertyNames(others)) {
        result[key] = switcher({ ...params, dataLink: dataLink[key] })
    }
    if (_value_) {
        if (typeof _value_ !== 'string') throw new Error('DataParserV4: _value_ must be a syntax string or a simple string.')
        if (isDataLink(_value_)) {
            if (!isLink(_value_) && !isFunctionCall(_value_)) throw new Error('DataParserV4: _value_ of field must be a simple link or a function call.')
            // _defaultValue_ field should contain a primitive value. todo: in future, it might be a dynamically evaluated value
            result['_value_'] = stringParser({ ...params, dataLink: _value_ }, _defaultValue_)
        } else result['_value_'] = _value_
    }
    // Adds a service object under a Symbol key that is related with the current schema field object.
    context[Symbol.for(result._objectId_)] = {}
    if (strictlyIsObject(_computations_)) {
        if (!isFunction(_value_)) {
            result._computations_ = computationsParser({ ...params, dataLink: _computations_ })
        } else throw new Error('DataParserV4: Render function in _value_ is allowed only in passive field.')
    }
    return result
}
/**
 * Processes _computations_ object.
 * @param params
 * @return {Object}
 */
const computationsParser = (params) => {
    const { dataLink } = params
    const {
        _initial_ = [], // todo: not implemented.
        _before_ = [], // todo: not implemented.
        _handlers_ = {},
        _after_ = [],
        _unmount_ = [] // todo: not implemented.
    } = dataLink
    const eventTypes = Object.getOwnPropertyNames(_handlers_)
    if (!eventTypes.length) return {}
    const computations = {
        _handlers_: {},
        _after_: []
    }
    for (const e of eventTypes) {
        if (Array.isArray(_handlers_[e]) && _handlers_[e].length) {
            computations._handlers_[e] = actionsParser({ ...params, dataLink: _handlers_[e] })
        } else if (typeof _handlers_[e] === 'string' && isFunctionCall(_handlers_[e])) {
            computations._handlers_[e] = stringParser({ ...params, dataLink: _handlers_[e] })
        } else throw new Error('DataParserV4: List of computations must be a non empty array, an object or a renderFunction string.')
    }
    if (Array.isArray(_after_) && _after_.length) {
        computations._after_ = actionsParser({ ...params, dataLink: _after_ })
    } else if (typeof _after_ === 'string' && isFunctionCall(_after_)) {
        computations._after_ = [ stringParser({ ...params, dataLink: _after_ }) ]
    } else if (!Array.isArray(_after_)) throw new Error('DataParserV4: Computation must be a renderFunction string (_after_).')

    return computations
}

/**
 * Processes passed list of renderFunction strings,
 * if they contains a links they are replaced by context's keys.
 * @param params
 * @returns {[]}
 */
const actionsParser = (params) => {
    const { dataLink } = params
    const actions = []
    for (const action of dataLink) {
        // if (typeof action !== 'string' || !isFunctionCall(action)) throw new Error('DataParserV4: Computation must be a renderFunction string.')
        if (strictlyIsObject(action)) {
            actions.push(objectParser({ ...params, dataLink: action }))
        } else if (typeof action === 'string') {
            actions.push(stringParser({ ...params, dataLink: action }))
        } else throw new Error('DataParserV4: action must be a dataLink string or a value object.')
    }
    return actions
}

/**
 * Resolves a schema template,
 * returns an array of schema objects with modified syntax strings.
 * Schema objects don't contain any data but only links to data in the context.
 * @param {Params} params
 * @param {string|null} mode
 * @returns {Array}
 */
const templateParser = (params, mode = null) => {
    const { dataLink, rootData, context, meta, tokens = {} } = params
    const { _template_, _dataLink_ } = dataLink
    if (!_template_) {
        throw new Error('DataParserV4: schema template should be provided.')
    }
    if ((mode === SECTIONS_MODE || mode === FIELDS_MODE) && !strictlyIsObject(_template_)) {
        throw new Error(`DataParserV4: template must be an object (${mode}).`)
    }
    if (!_dataLink_ || typeof _dataLink_ !== 'string' || !isLink(_dataLink_)) {
        throw new Error('DataParserV4: template must be provided with a _dataLink_ field and it should be a link.')
    }
    if (_dataLink_.endsWith('>')) {
        const index = _dataLink_.split('/').pop()
        const indexName = index.substring(1, index.length - 1)
        templateIndexNames.push(indexName)
    }
    const { data, dataPath } = parseDataLink({ ...params, dataLink: _dataLink_ }, true) // todo: may be the dataLink's data should be placed in the context...
    if (!Array.isArray(data)) {
        throw new Error('DataParserV4: data for a template must be an array.')
    }
    if (!context.hasOwnProperty(Symbol.for(dataPath))) {
        // Save the template schema and the current dataPath for item adding functionality.
        // It is written under a Symbol key to prevent processing on submitting data.
        context[Symbol.for(dataPath)] = { dataPath, schemaTemplate: _template_ }
    }
    const result = []
    for (let i = 0; i < data.length; i++) {
        const item = data[i]
        if (!strictlyIsObject(item) && !Array.isArray(item)) {
            throw new Error('DataParserV4: each template data item must be an object or an array.')
        }
        const objectId = objectIdGenerator.get()
        // The identifier is written to the data as a symbol-keyed value to prevent any processing this value on submit event.
        item[DATA_OBJECT_ID] = objectId
        let newDataLink
        if (strictlyIsObject(_template_)) {
            newDataLink = Object.create({}, {
                ...Object.getOwnPropertyDescriptors(_template_),
                _objectId_: {
                    value: objectId,
                    writable: false,
                    enumerable: false
                },
                _index_: {
                    value: i,
                    writable: false,
                    enumerable: false
                }
            })
        } else newDataLink = _template_
        params = {
            ...params,
            dataLink: newDataLink,
            data: item,
            rootData,
            dataPath: mergeLinks({ dataPath, middle: objectId, link: '@' }),
            meta: { ...meta, templateDataLink: dataPath, currentTemplateId: objectId },
            tokens: { ...tokens, ...item }
        }
        switch (mode) {
            case FIELDS_MODE:
                result.push(fieldParser(params))
                break
            case SECTIONS_MODE:
                result.push(objectParser(params))
                break
            default:
                result.push(switcher(params))
        }
    }
    return result
}

/**
 * Replaces all links to context keys,
 * reads values of all links from data and write them to the context.
 * @param {Params} params
 * @param {*} defaultValue
 * @return {string}
 */
const stringParser = (params, defaultValue = null) => {
    const { data, rootData, dataPath, context, tokens, renderFunctions } = params
    let { dataLink } = params
    if (!isDataLink(dataLink)) throw new Error('DataParserV4: dataLink must be a syntax string.')
    const dataLinkInstance = getDataLink(dataLink)
    const links = dataLinkInstance.containsLinks() ? dataLinkInstance.extractLinks() : []
    if (links.length) {
        for (let link of links) {
            const linkObj = getDataLink(link)
            const value = linkParser({ dataLink: linkObj, data, rootData, tokens, renderFunctions })
            if (/[/@]:[a-zA-Z0-9_]+\//.test(link)) {
                const newLink = replaceTokens(link, tokens, link.startsWith('@/') ? rootData : data, dataPath)
                dataLink = dataLink.replace(link, newLink)
                link = newLink
            }
            const contextKey = isRootLink(link) ? link : mergeLinks({ dataPath, link })
            if (value !== undefined) context[contextKey] = value
            const escapedContextKey = contextKey.replace(/(?<!\\)([@/])/g, '\\$1')
            dataLink = dataLink.replace(link, '@' + escapedContextKey)
        }
    }
    return dataLink
}

const replaceTokens = (link, tokens, rootData, dataPath) => {
    const parts = link.substring(1).split('/').filter(Boolean)
    const newLink = getNewParts(parts, tokens, rootData).join('/')
    if (link.startsWith('@/')) return '@/' + newLink
    return mergeLinks({ dataPath, link: '@' + newLink })
}

const getNewParts = (parts, tokens, data) => {
    const newParts = []
    parts.reduce((acc, part, index, parts) => {
        if (part.startsWith(':')) {
            const token = part.substring(1)
            part = tokens[token]
            acc.data = acc.data[part]
            if (templateIndexNames.includes(token)) {
                if (!acc.data.hasOwnProperty(DATA_OBJECT_ID)) throw new Error('DataParserV4: object must contain _objectId_ param.')
                acc.newParts.push(acc.data[DATA_OBJECT_ID])
            } else acc.newParts.push(part)
            return acc
        }
        acc.data = acc.data[part]
        acc.newParts.push(part)
        return acc
    }, { newParts, data })
    return newParts
}

/**
 * Creates an absolute link to data,
 * returned string that contains escaped the dog symbol and slashes.
 * @param {string} dataPath
 * @param {string} link
 * @param [{string|number}] middle
 * @return {string}
 */
const mergeLinks = ({ dataPath, link = '', middle }) => {
    if (isRootLink(link)) return link
    if (!dataPath) dataPath = '@/'
    return (dataPath + '/' + (middle ? middle + '/' : '') + link.substring(1))
        .replace(/\/{2,}/, '/')
}

/**
 * Reads _dataLink_ string that overrides the data context in a schema.
 * @param {Params} params
 * @param {boolean} shouldBeAdded
 * @return {{data: {Object}, dataPath: {string}}}
 */
const parseDataLink = (params, shouldBeAdded = false) => {
    const { dataLink, rootData, context, renderFunctions, tokens } = params
    let { data, dataPath } = params
    if (typeof dataLink !== 'string' || !isLink(dataLink)) throw new Error('DataParserV4: _dataLink_ must be a simple Link.')
    const pureDataLink = /<[a-zA-Z0-9_]+>$/.test(dataLink) ? dataLink.replace(/\/<.+>$/, '') : dataLink
    dataPath = mergeLinks({ dataPath, link: pureDataLink })
    data = linkParser({ dataLink: getDataLink(dataLink), data, rootData, renderFunctions, tokens })
    if (shouldBeAdded && !context.hasOwnProperty(dataPath)) context[pureDataLink] = data
    return { dataPath, data }
}

/**
 * Returns a parsed schema based on the passed schema template and adds to the context new values.
 * @param {string} dataPath
 * @param {Object} template
 * @returns {{ schema: {Object}, context: {Object} }} - the schema is parsed template,
 *                                                      the context is a new context only with new keys it should be merged with the main context.
 */
export const templateAddInfo = ({ dataPath = '@/', template }) => {
    if (!dataPath || typeof dataPath !== 'string' || !isLink(dataPath)) throw new Error('DataParserV4: dataPath must be a string.')
    if (!strictlyIsObject(template)) throw new Error('DataParserV4: template must be an object.')
    return dataParser({ dataLink: template, dataPath, data: {} })
}
/**
 * Returns a list of keys of the main context that must be deleted.
 * @param {string} dataLink
 * @param {Object} context
 * @returns {string[]}
 */
export const templateDeleteInfo = (dataLink, context) => {
    // todo: should return keys for deletion by a computation function. Now it changes the context directly.
    if (!dataLink || typeof dataLink !== 'string' || !isLink(dataLink)) return []
    return Object.keys(context).filter(item => item.startsWith(dataLink))
}

export default dataParser
