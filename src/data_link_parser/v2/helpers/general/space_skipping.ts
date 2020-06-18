import { DataLinkParserInterfaces } from '../../../../../types/types';

const spaceSkipping = (params: DataLinkParserInterfaces.v2.Params): string => {
    const { dataLink } = params;
    let count = 0;
    for (const current of dataLink) {
        count++;
        if (current[2] === ' ') continue;
        break;
    }
    return ' '.repeat(count);
};

export default spaceSkipping;
