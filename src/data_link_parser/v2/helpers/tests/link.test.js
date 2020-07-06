import linkParser from '../link';
import DataLink from '../../data_link';
import { DataParserError } from '../../data_parser_error';

describe('Some additional tests for the linkParser', () => {
    it('Link parser returns an iterator', () => {
        expect(linkParser({ dataLink: new DataLink('@link') })).toEqual(expect.objectContaining({
            next: expect.any(Function),
            [Symbol.iterator]: expect.any(Function)
        }));
     })

     it('The passed dataLink must start with @', () => {
         const lP = linkParser({ dataLink: new DataLink('some/link') });
         const fn = () => lP.next();
         expect(fn).toThrowError(DataParserError.ERRORS.ITERATOR_ERROR);
     })
})