export const DataParserError = (() => {
    function DataParserError (message, data) {
        Error.apply(this, arguments)
        this.name = 'DataParserError'
        this.message = message || 'DataParserError'
        this.data = data
        if (typeof Error.captureStackTrace === 'function') { // may not exist
            this.stack = Error.captureStackTrace(this, DataParserError)
        } else {
            this.stack = (new Error()).stack
        }
    }

    DataParserError.prototype = Object.create(Error.prototype)
    DataParserError.prototype.constructor = DataParserError
    return DataParserError
})()

DataParserError.ERRORS = {
    DATA_LINK_TYPE: 'The dataLink must be an instance of the DataLink!',
    ITERATOR_ERROR: 'Iterator value is incorrect',
    UNREACHABLE_PATH: 'Unreachable path',
    FUNCTION_NAMING: 'Function naming error',
    FUNCTION_ARGUMENTS: 'Function arguments error',
    FUNCTION_UNKNOWN: 'Unknown function error',
    OBJECT_KEY: 'Object key error',
    OBJECT_KEY_STRING: 'Object key is not a string error',
    OBJECT_VALUE: 'Object value error',
    ARRAY_VALUE: 'Array value error',
    VALUE: 'Object / Array value error',
    NESTING: 'Nesting error',
    LINK: 'Link parsing error',
    DEFAULT: 'Default parse error',
    INDEX_PART: 'Index should be a part of the link',
    INDEX_LAST: 'Index should be the last part of the link',
    INDEX_NAME: 'Index name contains disallowed symbols',
    INDEX_EMPTY: 'Index name must be a non empty string',
    INDEX_NOT_ARRAY_DATA: 'Only array may be indexed'
}
