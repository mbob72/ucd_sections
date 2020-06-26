import { DataParserError } from '../data_parser_error';
import DataLink from '../data_link';
import expressionParser from './expression';

describe('Some additional tests for the expressionParser', () => {
    it('Expression parser returns an iterator #1', () => {
        expect(expressionParser({ dataLink: new DataLink('()') })).toEqual(expect.objectContaining({
            next: expect.any(Function),
            [Symbol.iterator]: expect.any(Function)
        }));
     })

     it('Expression parser returns an iterator #2', () => {
        expect(expressionParser({ dataLink: new DataLink('()') }, true)).toEqual(expect.objectContaining({
            next: expect.any(Function),
            [Symbol.iterator]: expect.any(Function)
        }));
     })

    it('There is no open parenthesis of expression #1', () => {
        const dataLink = new DataLink('ab)');
        const fn = () => expressionParser({ dataLink }).next();
        expect(fn).toThrowError(DataParserError.ERRORS.ITERATOR_ERROR);
    })

    it('There is no open parenthesis of expression #2', () => {
        const dataLink = new DataLink('ab)');
        const fn = () => expressionParser({ dataLink }, true).next();
        expect(fn).toThrowError(DataParserError.ERRORS.ITERATOR_ERROR);
    })

    it('Expression: unexpected end of dataLink string (function mode) #1', () => {
        const dataLink = new DataLink('( `a`, ');
        const fn = () => { for(const {} of expressionParser({ dataLink }, true)) {} };
        expect(fn).toThrowError(DataParserError.ERRORS.NESTING);
    })

    it('Expression: unexpected end of dataLink string (function mode) #2', () => {
        const dataLink = new DataLink('( `a`,`b` ');
        const fn = () => { for(const {} of expressionParser({ dataLink }, true)) {} };
        expect(fn).toThrowError(DataParserError.ERRORS.NESTING);
    })

    it('Expression: skipped expression item (function mode)', () => {
        const dataLink = new DataLink('( `a`,, `b`)');
        const fn = () => { for(const {} of expressionParser({ dataLink }, true)) {} };
        expect(fn).toThrowError(DataParserError.ERRORS.FUNCTION_ARGUMENTS);
    })
})