/**
 * Converter's rules
 * @type {Object}
 */
const types = {
    'null': null,
    'false': false,
    'true': true
}
/**
 * Converts a string with "primitive" value such as
 * "true", "false", "null"
 * to real primitive value.
 * If the string is not "primitive" than returns the same string.
 * @param {String} str
 * @returns {*}
 */
const primitivesConverter = (str) => {
    return (typeof str === 'string' && types.hasOwnProperty(str)) ? types[str] : str
}

export default primitivesConverter
