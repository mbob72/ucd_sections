
import plainParser from './plain';
import DataLink from '../data_link';
import { DataParserError } from '../data_parser_error';

describe('Some additional tests for the plainParser', () => {
    it('The passed dataLink must starts with `', () => {
        const fn = () => plainParser({ dataLink: new DataLink('key') });
        expect(fn).toThrowError(DataParserError.ERRORS.ITERATOR_ERROR);
    })

    it('Closed quote is lost', () => {
        const fn = () => plainParser({ dataLink: new DataLink('`{ key: value }') });
        expect(fn).toThrowError(DataParserError.ERRORS.DEFAULT);
    })
})