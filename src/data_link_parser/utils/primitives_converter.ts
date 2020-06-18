import { hasOwnProperty } from '../../utils/utils';

/**
 * Converter's rules
 */
const types = {
    null: null,
    false: false,
    true: true,
};
/**
 * Converts a string with "primitive" value such as
 * "true", "false", "null"
 * to real primitive value.
 * If the string is not "primitive" than returns the same string.
 */
const primitivesConverter = (str: string): null | boolean | string => {
    return typeof str === 'string' && hasOwnProperty(types, str)
        ? types[str]
        : str;
};

export default primitivesConverter;
