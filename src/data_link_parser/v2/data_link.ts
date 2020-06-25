class DataLink implements Iterable<[ string, string, string ]> {
    static START = '\u0098';

    static END = '\u009C';

    private string: string;

    private processingString: string[];

    private pause: boolean;

    private currentValue!: [string, string, string];

    private current!: number;

    constructor(string: string) {
        if (typeof string !== 'string' || !string.trim())
            throw new Error('DataLink: The dataLink must be a not empty string!');
        this.string = string.trim();
        this.processingString = [ DataLink.START, ...this.string, DataLink.END ];
        this.pause = false;
        this.reset();
    }

    size(): number {
        return this.string.length;
    }

    containsLinks (): boolean { // is used only for sections/v4
        // warning: Lookbehind checking is compatible only with Chrome browser version 64 and higher.
        return /(?!<\\)@/.test(this.string);
    }

    extractLinks (): RegExpMatchArray | null { // is used only for sections/v4
        // warning: Lookbehind checking is compatible only with Chrome browser version 64 and higher.
        return this.string.match(/(?!<\\)(@[a-zA-Z0-9<>_\\:/.-]*)/g);
    }

    getCursorPositionInfo(): string {
        const { string } = this;
        const currentSymbol = this.getCurrentValue()[1];
        const isEnd = this.isEnd();
        const current = this.getCurrentIndex();
        return (
            string.slice(0, current) +
            '*>' +
            currentSymbol +
            '<*' +
            (isEnd ? '' : string.slice(current + 1, string.length))
        );
    }

    getNextValue(): [ string, string, string ] | never {
        if (this.isEnd()) throw new Error('DataLink: Index out of boundary.');
        this.current++;
        this.currentValue[0] = this.currentValue[1];
        this.currentValue[1] = this.currentValue[2];
        this.currentValue[2] = this.processingString[this.current + 1];
        return this.currentValue;
    }

    reset(): void {
        this.current = 1;
        this.currentValue = [
            this.processingString[0],
            this.processingString[1],
            this.processingString[2],
        ];
    }

    getCurrentIndex(): number {
        return this.current - 1;
    }

    getCurrentValue(): [ string, string, string ] {
        return this.currentValue;
    }

    isStart(): boolean {
        return this.currentValue[0] === DataLink.START;
    }

    isEnd(): boolean {
        return this.currentValue[2] === DataLink.END;
    }

    valueOf(): string {
        return this.string;
    }

    toString(): string {
        return this.string;
    }

    next(): IteratorYieldResult<[ string, string, string ]> | IteratorReturnResult<[ string, string, string ]> | never {
        if (this.pause) {
            this.pause = false;
            return { value: this.currentValue, done: false };
        } else if (!this.isEnd()) {
            return { value: this.getNextValue(), done: false };
        } else {
            return { value: [ '', '', '' ], done: true }; // stupid js iterable...
        }
    }

    [Symbol.iterator](): DataLink {
        this.pause = true;
        return this;
    }
}

export default DataLink;
