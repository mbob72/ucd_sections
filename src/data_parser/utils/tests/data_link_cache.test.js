// TODO: requires paths fix
import { syncDataParser } from '../../v5';
import getDataLink from '../data_link_cache';

const data = { b: { c: { d: 'value' } } };

describe('DataLink cache', () => {
    it('General testing', () => {
        const dataLink = '@b/c/d';
        const dataLinkInstance = getDataLink(dataLink);
        expect(getDataLink(dataLink)).toBe(dataLinkInstance);

        syncDataParser({ schema: dataLink, data: data });
        expect(dataLinkInstance.getCurrentValue()[1]).toEqual('d');
        expect(getDataLink(dataLink).getCurrentValue()[1]).toEqual('@');

        const dataLink2 = '@a/b/c';
        expect(getDataLink(dataLink2)).not.toBe(dataLinkInstance);

        const fn = () => getDataLink('');
        const fn2 = () => getDataLink({ key: 'value' });
        expect(fn).toThrowError(Error);
        expect(fn2).toThrowError(Error);
    });
});
