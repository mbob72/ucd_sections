import { DataLink } from '../../data_link_parser/v2';

const dataLinkMap = new Map<string, DataLink>();

const getDataLink = (dataLinkString: string): DataLink => {
    if (typeof dataLinkString !== 'string' || !dataLinkString)
        throw new Error('getDataLink: Data link should be a non empty string!');
    if (dataLinkMap.has(dataLinkString)) {
        const dataLink = dataLinkMap.get(dataLinkString) as DataLink;
        dataLink.reset();
        return dataLink;
    } else {
        const dataLink = new DataLink(dataLinkString);
        dataLinkMap.set(dataLinkString, dataLink);
        return dataLink;
    }
};

export default getDataLink;
