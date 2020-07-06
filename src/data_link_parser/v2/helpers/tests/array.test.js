import arrayParser from '../array';
import { DataParserError } from '../../data_parser_error';
import DataLink from '../../data_link';

describe('Some additional tests for the arrayParser', () => {
     it('Returns an iterator', () => {
        expect(arrayParser({ dataLink: new DataLink('[]') })).toEqual(expect.objectContaining({
            next: expect.any(Function),
            [Symbol.iterator]: expect.any(Function)
        }));
     })

    it('There is no open parenthesis', () => {
        const dataLink = new DataLink('ab]');
        const fn = () => arrayParser({ dataLink }).next();
        expect(fn).toThrowError(DataParserError.ERRORS.ITERATOR_ERROR);
    })

    it('Parse empty array #1', () => {
        const dataLink = new DataLink('[]');
        const { value, done } = arrayParser({ dataLink }).next();
        expect(value).toEqual([]);
        expect(done).toEqual(true);
    })

    it('Parse empty array #2', () => {
        const dataLink = new DataLink('[   ]');
        const { value, done } = arrayParser({ dataLink }).next();
        expect(value).toEqual([]);
        expect(done).toEqual(true);
    })

    it('Unexpected end of dataLink string #1', () => {
        const dataLink = new DataLink('[ `a`, ');
        const fn = () => { for(const {} of arrayParser({ dataLink })) {} };
        expect(fn).toThrowError(DataParserError.ERRORS.NESTING);
    })

    it('Unexpected end of dataLink string #2', () => {
        const dataLink = new DataLink('[ `a` ');
        const fn = () => { for(const {} of arrayParser({ dataLink })) {} };
        expect(fn).toThrowError(DataParserError.ERRORS.NESTING);
    })

    it('Unexpected end of dataLink string #3', () => {
        const dataLink = new DataLink('[ [`a`] ');
        const fn = () => { for(const {} of arrayParser({ dataLink })) {} };
        expect(fn).toThrowError(DataParserError.ERRORS.NESTING);
    })

    it('Unexpected end of dataLink string #4', () => {
        const dataLink = new DataLink('[ `a`, \\a  ');
        const fn = () => { for(const {} of arrayParser({ dataLink })) {} };
        expect(fn).toThrowError(DataParserError.ERRORS.NESTING);
    })

    it('Empty array item #1', () => {
        const dataLink = new DataLink('[ `a`,,`b`]');
        const fn = () => { for(const {} of arrayParser({ dataLink })) {} };
        expect(fn).toThrowError(DataParserError.ERRORS.ARRAY_VALUE);
    })

    it('Empty array item #2', () => {
        const dataLink = new DataLink('[ `a`,   ,`b`]');
        const fn = () => { for(const {} of arrayParser({ dataLink })) {} };
        expect(fn).toThrowError(DataParserError.ERRORS.ARRAY_VALUE);
    })
})