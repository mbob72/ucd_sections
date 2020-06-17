import { DataLink } from './';

/* eslint-disable @typescript-eslint/no-explicit-any */
class DataParserError extends Error {

    static ERRORS = {
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
        INDEX_NOT_ARRAY_DATA: 'Only array may be indexed',
    }

    public data: any;

    public message: string;

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(message: string, data?: any, dataLink?: DataLink) {
        super(message);
        Object.setPrototypeOf(this, DataParserError.prototype);
        this.message = message || 'DataParserError';
        this.data = data;
        if (dataLink) this.setFullMessage(dataLink);
    }

    setFullMessage(dataLink: DataLink): void {
        const info = dataLink.getCursorPositionInfo();
        let fullMessage =
            this.message +
            ', dataLink: "' +
            info +
            '" at position ' +
            dataLink.getCurrentIndex();
        if (dataLink.isEnd()) {
            fullMessage += ' (out of the string)';
        }
        this.message = fullMessage;
    }
}

export { DataParserError };
