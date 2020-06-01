class DataLink {
    static START = '\u0098'
    static END = '\u009C'

    constructor (string) {
        if (typeof string !== 'string' || !string.trim()) throw new Error('DataLink: The dataLink must be a not empty string!')
        this.string = string.trim()
        this.processingString = [ DataLink.START, ...this.string, DataLink.END ]
        this.reset()
    }

    size () {
        return this.string.length
    }

    containsLinks () {
        // Warning! Lookbehind checking is compatible only with Chrome browser version 64 and higher.
        return /(?!<\\)@/.test(this.string)
    }

    extractLinks () {
        // Warning! Lookbehind checking is compatible only with Chrome browser version 64 and higher.
        return this.string.match(/(?!<\\)(@[a-zA-Z0-9<>_\\:/.-]*)/g)
    }

    getCursorPositionInfo () {
        const { string } = this
        const currentSymbol = this.getCurrentValue()[1]
        const isEnd = this.isEnd()
        const current = this.getCurrentIndex()
        return string.slice(0, current) + '*>' + currentSymbol + '<*' + (isEnd ? '' : string.slice(current + 1, string.length))
    }

    getNextValue () {
        if (this.pause) {
            this.pause = false
            return this.currentValue
        }
        if (this.current > this.string.length) return undefined
        this.current++
        this.currentValue[0] = this.currentValue[1]
        this.currentValue[1] = this.currentValue[2]
        this.currentValue[2] = this.processingString[this.current + 1]
        return this.currentValue
    }

    reset () {
        this.current = 1
        this.currentValue = [
            this.processingString[0],
            this.processingString[1],
            this.processingString[2]
        ]
        this.iteratorValue = { value: this.currentValue, done: false }
    }

    getCurrentIndex () {
        return this.current ? this.current - 1 : 0
    }

    getCurrentValue () {
        return this.currentValue
    }

    isStart () {
        return this.currentValue[0] === DataLink.START
    }

    isEnd () {
        return this.currentValue[2] === DataLink.END
    }

    valueOf () {
        return this.string
    }

    toString () {
        return this.string
    }

    next () {
        if (this.current > this.string.length) return { value: undefined, done: true }
        this.iteratorValue.value = this.getNextValue()
        return this.iteratorValue
    }

    [Symbol.iterator] () {
        this.pause = true
        return this
    }
}

export default DataLink
