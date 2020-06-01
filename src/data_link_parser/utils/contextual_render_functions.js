import isObject from './is_object'

function getContextualConstructor () {
    /**
     * This constructor defines a runtime context with the values, props and setValues.
     * The computations and validations are need in these params.
     * @todo: The params list should be dynamic. It may be implemented through the "new Function(...)" syntax.
     * @param {Object} values - it is usually a state of the client create/edit page.
     * @param {Object} props - it is usually a props object of the current react component
     *                         (a field on the client create/edit page).
     * @param {Function} setValues - a method that is used to update the state.
     * @constructor
     */
    return function ContextualRenderFunctions (values, props, setValues) {
        if (!new.target) throw new Error('ContextualRenderFunctions: Must be invoked as a constructor!')
        this.values = values
        this.props = props
        this.setValues = setValues
    }
}

/**
 * This function connects passed objects with functions to the ContextualRenderFunctions's prototype.
 * @param {Array<Object>} args - a list of objects with methods that should be executed in some dynamic context
 *                               (these are usually the computations, validations and renderFunctions).
 * @returns {FunctionConstructor}
 */
export function composeContextualRenderFunctions (...args) {
    if (!args.length) throw new Error('composeContextualRenderFunctions: at least one object with functions must be passed!')
    const joinedRF = args.reduce((acc, arg) => ({ ...acc, ...arg }), {})
    const ContextualRenderFunctions = getContextualConstructor()
    ContextualRenderFunctions.prototype = { ...joinedRF, constructor: ContextualRenderFunctions.prototype.constructor }
    return ContextualRenderFunctions
}

/**
 * Returns true if the passed object is an instance of the ContextualRenderFunctions constructor.
 * @param {Object} object
 * @returns {boolean}
 */
export function isContextualRenderFunctions (object) {
    if (isObject(object)) {
        const proto = Object.getPrototypeOf(object)
        return proto.constructor.name === 'ContextualRenderFunctions'
    }
    return false
}
