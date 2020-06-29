import DataLink from '../data_link';

describe('DataLink tests', () => {
    it('String must be passed', () => {
        const fn = () => new DataLink({});
        expect(fn).toThrow(Error);
    })

    it('The passed string can not be empty', () => {
        const fn = () => new DataLink('');
        expect(fn).toThrow(Error);
    })

    it('String that contains only whitespaces is invalid', () => {
        const fn = () => new DataLink('   ');
        expect(fn).toThrow(Error);
    })

    it('Size of dataLink string', () => {
        const size = (new DataLink('123')).size();
        expect(size).toEqual(expect.any(Number));
        expect(size).toEqual(3);
    })

    it('Test containsLinks utility', () => { // is used only for dataParser/v4
        const contains = new DataLink('@link');
        const notContains = new DataLink('$function()');
        expect(contains.containsLinks()).toBeTruthy();
        expect(notContains.containsLinks()).toBeFalsy();
    })

    it('Test extract links utility', () => { // is used only for dataParser/v4
        const dataLink = new DataLink('{ key: (@/link, $function(@link2)), key2: @link3 }')
        expect(dataLink.extractLinks()).toEqual([ '@/link', '@link2', '@link3' ])
    })

    it('Test DataLink interface', () => {
        const dataLink = new DataLink('ab');
        expect(dataLink).toEqual(expect.objectContaining({
            next: expect.any(Function),
            [Symbol.iterator]: expect.any(Function),
            valueOf: expect.any(Function),
            toString: expect.any(Function),
            getCurrentIndex: expect.any(Function),
            getCurrentValue: expect.any(Function),
            getNextValue: expect.any(Function),
            reset: expect.any(Function),
            isStart: expect.any(Function),
            isEnd: expect.any(Function)
        }))
        expect(dataLink[Symbol.iterator]()).toBe(dataLink);
        expect(dataLink.next()).toEqual(expect.objectContaining({ value: expect.anything(), done: expect.any(Boolean) }))
        expect(dataLink.next()).toEqual({ value: [ 'a', 'b', DataLink.END ], done: false });
        expect(dataLink.next()).toEqual({ value: [ '', '', '' ], done: true });
        expect(dataLink.valueOf()).toEqual('ab');
        expect(dataLink.toString()).toEqual('ab');
        expect(dataLink.getCurrentIndex()).toEqual(expect.any(Number));
    })

    it('Test getting the next value', () => {
        const dataLink = new DataLink('1234');
        expect(dataLink.getCurrentValue()).toEqual([ DataLink.START, '1', '2' ])
        expect(dataLink.getNextValue()).toEqual([ '1', '2', '3' ])
        expect(dataLink.getCurrentValue()).toEqual([ '1', '2', '3' ])
    })

    it('Test isStart and isEnd utilities', () => {
        const dataLink = new DataLink('a');
        expect(dataLink.isStart()).toBeTruthy();
        expect(dataLink.isEnd()).toBeTruthy();

        const dataLink2 = new DataLink('abcd');
        expect(dataLink2.isStart()).toBeTruthy();
        expect(dataLink2.isEnd()).toBeFalsy();
        for(const {} of dataLink2) {};
        expect(dataLink2.isStart()).toBeFalsy();
        expect(dataLink2.isEnd()).toBeTruthy();
    })

    it('Index out of boundary', () => {
        const dataLink = new DataLink('123');
        for (const current of dataLink) {};
        const fn = () => dataLink.getNextValue();
        expect(fn).toThrow(Error);
    })

    it('Test resetting', () => {
        const dataLink = new DataLink('1234');
        expect(dataLink.getCurrentValue()).toEqual([ DataLink.START, '1', '2' ]);
        expect(dataLink.getCurrentIndex()).toEqual(0);
        for (const {} of dataLink) {}
        expect(dataLink.getCurrentValue()).toEqual([ '3', '4', DataLink.END ]);
        expect(dataLink.getCurrentIndex()).toEqual(3);
        dataLink.reset();
        expect(dataLink.getCurrentValue()).toEqual([ DataLink.START, '1', '2' ]);
        expect(dataLink.getCurrentIndex()).toEqual(0);
    })
});