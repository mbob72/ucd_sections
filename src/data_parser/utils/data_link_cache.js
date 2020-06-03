import { DataLink } from '../../data_link_parser/v1';

const dataLinkMap = new Map();
/**
 *
 * @param dataLinkString
 * @return DataLink
 */
const getDataLink = (dataLinkString) => {
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
