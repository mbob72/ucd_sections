import { deepMerge } from '../';

describe('Tests for the deepMerge utility', () => {
    it('Deep merging', () => {
        // todo: test propertyDescriptions saving.
        const date = new Date();
        const source = {
            array: [ 1, 2, 3 ],
            array2: [ { key: 123 }, { key2: '123' } ],
            object: { object: { key: 123 }, [Symbol.for('key')]: 'symbol', date },
            object2: { object: { array: [ 5, 6, 7 ], object: { key: 'string', [Symbol.for('key')]: 'symbol' } } },
            string: 'stringSource'
        };
        const dest = {
            array2: [ { key: 456 }, { key2: '456' } ],
            array3: [ 'a', 'b', 'c' ],
            object: { object: { key2: 123 } },
            object3: { key: 'string' },
            string: 'stringDest'
        };

        const result = {
            array2: [ { key: 456 }, { key2: '456' }, { key: 123 }, { key2: '123' } ],
            array3: [ 'a', 'b', 'c' ],
            object: { object: { key2: 123, key: 123 }, [Symbol.for('key')]: 'symbol', date },
            array: [ 1, 2, 3 ],
            string: 'stringSource',
            object2: { object: { array: [ 5, 6, 7 ], object: { key: 'string', [Symbol.for('key')]: 'symbol' } } },
            object3: { key: 'string' }
        }

        const merged = deepMerge(dest, source);
        expect(merged).toStrictEqual(result);
        expect(merged.object.date).toBe(source.object.date);
        expect(merged.array3).not.toBe(dest.array3);
        expect(merged.object3).not.toBe(dest.object3);
        expect(merged.object2).not.toBe(source.object2);
        expect(merged.array).not.toBe(source.array);
        expect(merged.array2[2]).not.toBe(source.array2[0]);
    })

    it('Difference type of merged objects', () => {
        const fn = () => deepMerge([ 1, 2, 3 ], { key: '123' })
        expect(fn).toThrow(Error);
    })
})