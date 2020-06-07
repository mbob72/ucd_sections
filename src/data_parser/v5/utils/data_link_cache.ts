import { DataLink } from '../../../data_link_parser/v2';

const dataLinkMap = new Map<string, DataLink>();

const getDataLink = (dataLinkString: string): DataLink => {
    if (typeof dataLinkString !== 'string' || !dataLinkString)
        throw new Error('getDataLink: Data link should be a non empty string!');
    if (!dataLinkMap.has(dataLinkString)) {
        dataLinkMap.set(dataLinkString, new DataLink(dataLinkString));
    } else {
        dataLinkMap.get(dataLinkString).reset();
    }
    return dataLinkMap.get(dataLinkString);
};

export default getDataLink;
