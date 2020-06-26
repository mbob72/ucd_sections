
import objectParser from './object';
import DataLink from '../data_link';
import { DataParserError } from '../data_parser_error';

describe('Some additional tests for the objectParser', () => {
    it('Object parser returns an iterator', () => {
        expect(objectParser({ dataLink: new DataLink('{}') })).toEqual(expect.objectContaining({
            next: expect.any(Function),
            [Symbol.iterator]: expect.any(Function)
        }));
     })

     it('The passed dataLink must start with {', () => {
         const oP = objectParser({ dataLink: new DataLink('key: value }') });
         const fn = () => oP.next();
         expect(fn).toThrowError(DataParserError.ERRORS.ITERATOR_ERROR);
     })
})