import valueParser from '../value';
import DataLink from '../../../data_link'
import { DataParserError } from '../../../data_parser_error';


describe('Some additional tests for the valueParser', () => {
    it('Returns an iterator', () => {
        expect(valueParser({ dataLink: new DataLink('[]') })).toEqual(expect.objectContaining({
            next: expect.any(Function),
            [Symbol.iterator]: expect.any(Function)
        }));
     })

     it('Incorrect start cursor position', () => {
         let dataLink = new DataLink('( value )');
         for (const i = 0; i < 3; i++) dataLink.next();
         const fn1 = () => valueParser({ dataLink }).next();
         expect(fn1).toThrowError(DataParserError.ERRORS.ITERATOR_ERROR);

         let dataLink = new DataLink('[ value ]');
         for (const i = 0; i < 3; i++) dataLink.next();
         const fn2 = () => valueParser({ dataLink }, true).next();
         expect(fn2).toThrowError(DataParserError.ERRORS.ITERATOR_ERROR);

         let dataLink = new DataLink('{ key: value }');
         for (const i = 0; i < 6; i++) dataLink.next();
         const fn3 = () => valueParser({ dataLink }, false).next();
         expect(fn3).toThrowError(DataParserError.ERRORS.DEFAULT);

         dataLink.reset();
         for (const i = 0; i < 8; i++) dataLink.next();
         const fn4 = () => valueParser({ dataLink }, false).next();
         expect(fn4).toThrowError(DataParserError.ERRORS.ITERATOR_ERROR);
     })

     it('Unexpected and of dataLink #1', () => {
         const dataLink = new DataLink('[ value');
         dataLink.next();
         dataLink.next();
         const vP = valueParser({ dataLink }, true);
         const fn = () => { for (const {} of vP); }
         expect(fn).toThrowError(DataParserError.ERRORS.NESTING);
     })

     it('Unexpected and of dataLink #2', () => {
        const dataLink = new DataLink('[ value\\$');
        dataLink.next();
        dataLink.next();
        const vP = valueParser({ dataLink }, true);
        const fn = () => { for (const {} of vP); }
        expect(fn).toThrowError(DataParserError.ERRORS.NESTING);
    })

    it('Unexpected and of dataLink #3', () => {
        const dataLink = new DataLink('[ (expression value)');
        dataLink.next();
        dataLink.next();
        const vP = valueParser({ dataLink }, true);
        const fn = () => { for (const {} of vP); }
        expect(fn).toThrowError(DataParserError.ERRORS.NESTING);
    })
})