/* eslint-disable no-extend-native */
if (!Function.prototype.isGenerator) {
    Function.prototype.isGenerator = function () {
        return this.constructor.name === 'GeneratorFunction'
    }
}

Function.prototype.isAsyncGenerator = function () {
    // info: https://www.ecma-international.org/ecma-262/10.0/index.html#sec-asyncgeneratorfunction-constructor
    return this.constructor.name === 'AsyncGeneratorFunction'
}

if (!Function.prototype.isAsync) {
    Function.prototype.isAsync = function () {
        return this.constructor.name === 'AsyncFunction'
    }
}

if (!Array.prototype.flat) {
    Array.prototype.flat = function (depth = 1) {
        depth = isNaN(depth) ? 0 : Math.floor(depth)
        if (depth < 1) return this.slice()
        return [].concat(
            ...(depth < 2)
                ? this
                : this.map(v => Array.isArray(v) ? v.flat(depth - 1) : v)
        )
    }
}

/* eslint-disable no-console */
if (!console.deinfo) {
    console.deinfo = (...args) => {} // console.warn(...args)
}
/* eslint-enable no-console */
