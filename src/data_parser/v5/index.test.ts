import { syncDataParser, asyncDataParser, genDataParser } from './index';
import { DataParserError } from '../../data_link_parser/v2/data_parser_error';
import jest from 'jest';

const renderFunctions = {
    formatUppercase: s => s.toUpperCase(),
    formatLowercase: s => s.toLowerCase(),
    contextualFunction: function () {
        return renderFunctions.formatUppercase(this.a);
    },
    getCKey: () => 'c',
    getObject: () => ({
        key: {
            key2: 'value2'
        },
        key3: [
            {
                key4: 'value41',
                key5: 'value51'
            },
            {
                key4: 'value42',
                key5: 'value52'
            }
        ]
    }),
    getArray: () => [ 1, 2, 3, 4, 5 ],
    formatPlus: ([ a, b ]) => +a + +b,
    commaSeparatedParams: function (...args: any[]): string {
        let res = 'test_';
        for (let i = 0; i < args.length; i++) {
            res += args[i];
        }
        return res;
    },
    emptyParams: jest.fn(() => 'done')
};

const data = {
    a: 'a',
    b: {
        c: {
            d: 'd'
        },
        kd: {
            ke: 'ke'
        },
        someBKey: 'C'
    },
    c: true,
    d: null,
    e: 10,
    f: 20,
    g: [ { a: 1, b: 'b1' }, { a: 2, b: 'b2' } ],
    bigD: 'D',
    someRootKey: 'C',
    detail: {
        personalManager: 'qwerty'
    },
    categories: [ { type: 1 } ]
};

describe('Schema V3', () => {
    it('array parsing #1', () => {
        const schema = [ 1, 'string', null ];
        const result = syncDataParser({ schema: schema, data });
        expect(result).toEqual(schema);
    });

    it('array parsing #2', () => {
        const schema = [ 1, '@b/c/d', null ];
        const result = syncDataParser({ schema: schema, data });
        expect(result).toEqual([ 1, data.b.c.d, null ]);
    });

    it('object parsing and data context overriding', () => {
        const schema = {
            key: 'string',
            _dataLink_: '@b',
            _section_: {
                key: '@c/d',
                key2: '@/b/c/d'
            }
        };
        const result = syncDataParser({ schema: schema, data });
        expect(result).toEqual({ ...schema, _dataLink_: data.b, _section_: { key: data.b.c.d, key2: data.b.c.d } });
    });

    it('special cases #1: dataLink is undefined', () => {
        const result = syncDataParser({ data });
        expect(result).toEqual(data);
    });

    it('special cases #2: data is empty', () => {
        const schema = [ 1, 'string', null ];
        const emptyDataValues = [ {}, [], null, undefined, '', NaN, false ];
        for (const empty of emptyDataValues) {
            const result = syncDataParser({ schema: schema, data: empty });
            expect(result === null).toBeTruthy();
        }
    });

    it('template parsing #1', () => {
        const schema = {
            _dataLink_: '@g',
            _template_: {
                key: '@b'
            }
        };
        const expectedResult = [
            {
                key: data.g[0].b
            },
            {
                key: data.g[1].b
            }
        ];
        const result = syncDataParser({ schema: schema, data });
        expect(result).toEqual(expectedResult);
    });

    it('template parsing #2', () => {
        const schema = {
            _dataLink_: '@g',
            _sections_: {
                _template_: {
                    key: '@b'
                }
            }
        };
        const expectedResult = {
            _dataLink_: data.g,
            _sections_: [
                {
                    key: data.g[0].b
                },
                {
                    key: data.g[1].b
                }
            ]
        };
        const result = syncDataParser({ schema: schema, data });
        expect(result).toEqual(expectedResult);
    });

    it('template parsing #3', () => {
        const schema = {
            _dataLink_: '@b',
            _sections_: {
                _template_: {
                    key: '@c/d'
                }
            }
        };
        const fn = () => syncDataParser({ schema: schema, data });
        expect(fn).toThrowError(Error);
    });
});

describe('Primary functionality', () => {
    it('should return value if data link is not @link', () => {
        const schem = '1, qwerty';
        expect(syncDataParser({ schema, data }))
            .toEqual(schema
);
    });

    it('should get data by local key', () => {
        const schem = '@a';
        expect(syncDataParser({ schema, data }))
            .toEqual(data.a);
    });

    it('should get data by local composite key', () => {
        const schem = '@b/c/d/';
        expect(syncDataParser({ schema, data }))
            .toEqual(data.b.c.d);
    });

    it('should get data by global key', () => {
        const schem = '@/a';
        expect(syncDataParser({ schema, data: data.c, rootData: data }))
            .toEqual(data.a);
    });

    it('should return object if this is the only variable in a link', () => {
        const schem = '@b';
        expect(syncDataParser({ schema, data }))
            .toEqual(data.b);
    });

    it('should understand complex links with text and escaped symbols', () => {
        const schem = '@a @b/c/d 100\\$';
        expect(syncDataParser({ schema, data }))
            .toEqual(`${data.a} ${data.b.c.d} 100$`);
    });

    it('should get default value if it can\'t find value or wrong path', () => {
        const schem = '@a/b/c/d';
        const defaultValue = 'default value';
        expect(syncDataParser({ schema, data, defaultValue }))
            .toEqual(defaultValue);
    });

    it('should return undefined when data is not accessible by given path / wrong path', () => {
        const schem = '@a/b/c/d';
        const value = syncDataParser({ schema, data });
        expect(value === undefined).toBeTruthy();
    });

    it('should parse as plain string if it is escaped by ``', () => {
        const schem = '@a/b/c/d';
        expect(syncDataParser({ schema: `\`${schem}\``, data })).toEqual(schema);
    });

    it('an escaped symbol ` inside a plain string (rounded by ``) should be parsed as plain', () => {
        const schem = '\\`@a';
        expect(syncDataParser({ schema: `\`${schem}\``, data })).toEqual('`@a');
    });
});

describe('Extended link functionality', () => {
    it('Functions in a link: evaluate a new key #01', () => {
        const schem = '@b/$getCKey()/d';
        expect(syncDataParser({ schema, data }))
            .toEqual(data.b.c.d);
    });
    it('Functions in a link: evaluate a new key #02', () => {
        const schem = '@b/$formatLowercase(@someBKey)/d';
        expect(syncDataParser({ schema, data }))
            .toEqual(data.b.c.d);
    });
    it('Functions in a link: evaluate a new key #03', () => {
        const schem = '@b/$formatLowercase(@/someRootKey)/d';
        expect(syncDataParser({ schema, data }))
            .toEqual(data.b.c.d);
    });
    it('Functions in a link: evaluate a middleware object #01', () => {
        const schem = '@b/$getObject()/key/key2';
        const object = renderFunctions.getObject();
        expect(syncDataParser({ schema, data }))
            .toEqual(object.key.key2);
    });
    it('Expressions in a link: simple expression.', () => {
        const schem = '@b/(c)/d';
        expect(syncDataParser({ schema, data }))
            .toEqual(data.b.c.d);
    });
    it('Expressions in a link: complex expression #1.', () => {
        const schem = '@b/(k(@c/d))/ke';
        expect(syncDataParser({ schema, data }))
            .toEqual(data.b.kd.ke);
    });
    it('Expressions in a link: complex expression #2.', () => {
        const schem = '@b/(k($formatLowercase(@/bigD)))/ke';
        expect(syncDataParser({ schema, data }))
            .toEqual(data.b.kd.ke);
    });
    it('Expressions in a link: complex expression #3.', () => {
        const schem = '@b/(@c/d, @someBKey)';
        expect(syncDataParser({ schema, data }))
            .toEqual(`${data.b.c.d}, ${data.b.someBKey}`);
    });
    it('Objects in a link.', () => {
        const schem = '@b/{d: @c/d, someBKey: @someBKey}';
        expect(syncDataParser({ schema, data }))
            .toEqual({ d: data.b.c.d, someBKey: data.b.someBKey });
    });
    it('Arrays in a link.', () => {
        const schem = '@b/[@c/d, @kd/ke, @/bigD]';
        expect(syncDataParser({ schema, data }))
            .toEqual([ data.b.c.d, data.b.kd.ke, data.bigD ]);
    });
    it('Index array of objects.', () => {
        const schem = '@g/<index>';
        const result = data.g.map((item, i) => {
            item.index = i;
            return item;
        });
        expect(syncDataParser({ schema, data }))
            .toEqual(result);
    });
    it('Errors: index must be the last part of a link.', () => {
        const schem = '@g/<index>/a';
        const f = () => syncDataParser({ schema, data });
        expect(f)
            .toThrowError(DataParserError.ERRORS.INDEX_LAST);
    });
    it('Errors: incorrect index name.', () => {
        const schem = '@g/<$index>';
        const f = () => syncDataParser({ schema, data });
        expect(f)
            .toThrowError(DataParserError.ERRORS.INDEX_NAME);
    });
    it('Errors: empty index name.', () => {
        const schem = '@g/<>';
        const f = () => syncDataParser({ schema, data });
        expect(f)
            .toThrowError(DataParserError.ERRORS.INDEX_EMPTY);
    });
    it('Errors: index of not array data.', () => {
        const schem = '@b/<index>';
        const f = () => syncDataParser({ schema, data });
        expect(f)
            .toThrowError(DataParserError.ERRORS.INDEX_NOT_ARRAY_DATA);
    });
    it('Errors: index should be an independent part of a link.', () => {
        const schem = '@g/<index>key';
        const f = () => syncDataParser({ schema, data });
        expect(f)
            .toThrowError(DataParserError.ERRORS.INDEX_PART);
    });
});

describe('Expressions', () => {
    it('should resolve empty expression as an empty string', () => {
        const schem = '()';
        expect(syncDataParser({ schema, data }))
            .toEqual('');
    });
    it('should resolve expressions locally', () => {
        const schem = '(@a)b';
        expect(syncDataParser({ schema, data }))
            .toEqual(`${data.a}b`);
    });

    it('should resolve whitespace in expressions', () => {
        const schem = '(@a @e)b';
        expect(syncDataParser({ schema, data }))
            .toEqual(`${data.a} ${data.e}b`);
    });

    it('should resolve whitespace and comma in expressions', () => {
        const schem = '(@a, @e)b';
        expect(syncDataParser({ schema, data }))
            .toEqual(`${data.a}, ${data.e}b`);
    });

    it('should trim whitespaces at start and end of the expression', () => {
        const schem = '( @a, @e )b';
        expect(syncDataParser({ schema, data }))
            .toEqual(`${data.a}, ${data.e}b`);
    });

    it('should resolve nested expressions and drop spaces at the start and the end of an expression', () => {
        const schem = '((     )((@a )+ ) )b';
        expect(syncDataParser({ schema, data }))
            .toEqual(`${data.a}+b`);
    });

    it('should throw error if nesting is broken', () => {
        const schem = '()(@a()))\\$';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });
    it('should throw error if nesting is broken #2', () => {
        const schem = '()(@a()';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });
});

describe('Functions', () => {
    it('should work if params list is empty', () => {
        const mock = renderFunctions.emptyParams;
        const schem = '$emptyParams()';
        const result = syncDataParser({ schema, data });
        expect(typeof mock.mock.calls[0][0])
            .toEqual('undefined');
        expect(result)
            .toEqual(renderFunctions.emptyParams());
    });
    it('should work with render functions', () => {
        const schem = '$formatUppercase(@a)';
        expect(syncDataParser({ schema, data }))
            .toEqual(renderFunctions.formatUppercase(data.a));
    });

    it('should work with render functions with several comma-separated params', () => {
        const schem = '$commaSeparatedParams(  @a      , [@e, @d]    ,    { f: @f }    )';
        expect(syncDataParser({ schema, data }))
            .toEqual(renderFunctions.commaSeparatedParams(data.a, [ data.e, data.d ], { f: data.f }));
    });

    it('should work with two render functions on the same level', () => {
        const schem = '$formatUppercase(@a) $formatUppercase(@b/c/d)';
        expect(syncDataParser({ schema, data }))
            .toEqual(`${renderFunctions.formatUppercase(data.a)} ${renderFunctions.formatUppercase(data.b.c.d)}`);
    });

    it('should work with nested render functions', () => {
        const schem = '$formatLowercase($formatUppercase(@a))';
        expect(syncDataParser({ schema, data, renderFunctions }))
            .toEqual(renderFunctions.formatLowercase(renderFunctions.formatUppercase(data.a)));
    });

    it('should return a reference to a function with dynamic context that referenced to the data object.', () => {
        const schem = '$contextualFunction';
        const f = syncDataParser({ schema, data, renderFunctions });
        expect(typeof f === 'function' && f.name === 'bound contextualFunction').toBeTruthy();
        expect(f()).toEqual(renderFunctions.contextualFunction.call(data));
    });

    it('should throw an error if function has incorrect name', () => {
        const schem = '$form*&atUppercase';
        const f = () => syncDataParser({ schema, data, renderFunctions });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.FUNCTION_NAMING);
    });

    it('should throw an exception if renderFunction is not found', () => {
        const schem = '$formatQwerty(@a)';
        const f = () => syncDataParser({ schema, data, renderFunctions });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.FUNCTION_UNKNOWN);
    });
});

describe('Arrays', () => {
    it('should resolve primary values inside array', () => {
        const schem = [ 1, '1', true, null ];
        expect(syncDataParser({ schema, data }))
            .toEqual([ 1, '1', true, null ]);
    });

    it('should resolve links inside array', () => {
        const schem = [ '@a', '@c', '@d' ];
        expect(syncDataParser({ schema, data }))
            .toEqual([ data.a, data.c, data.d ]);
    });

    it('should resolve link as array (with a lot of white spaces)', () => {
        const schem = '[     @b/c/d     ,      @c     ]';
        expect(syncDataParser({ schema, data }))
            .toEqual([ data.b.c.d, data.c ]);
    });

    it('the DataParserError.ARRAY_VALUE error should be thrown when there is a white space inside an array\'s value', () => {
        const schem = '[foo bar]';
        const fn = () => syncDataParser({ schema, data });
        expect(fn).toThrowError(DataParserError.ERRORS.ARRAY_VALUE);
    });

    it('should parse array with primitive values', () => {
        const schem = '[@a, qwerty, foo, bar, true, false, null]';
        expect(syncDataParser({ schema, data }))
            .toEqual([ data.a, 'qwerty', 'foo', 'bar', true, false, null ]);
    });

    it('should resolve link as nested array', () => {
        const schem = '[[@a, [@c]], [@a, @d]]';
        expect(syncDataParser({ schema, data }))
            .toEqual([ [ 'a', [ true ] ], [ 'a', null ] ]);
    });

    it('should convert array into renderFunction arguments', () => {
        const schem = '$formatPlus([@b/c/d, @f])';
        expect(syncDataParser({ schema, data }))
            .toEqual(renderFunctions.formatPlus([ data.b.c.d, data.f ]));
    });

    it('should resolve link as array and use renderFunction if needed', () => {
        const schem = '[$formatUppercase(@a), $formatUppercase(@b/c/d)]';
        expect(syncDataParser({ schema, data }))
            .toEqual([ renderFunctions.formatUppercase(data.a), renderFunctions.formatUppercase(data.b.c.d) ]);
    });

    it('should throw array value arror', () => {
        const schem = '[1-5]';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.ARRAY_VALUE);
    });

    it('should throw nesting error if number of parenthesis mismatch 1', () => {
        const schem = '[[@a]';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });

    it('should throw nesting error if number of parenthesis mismatch 2', () => {
        const schem = '[@a]]';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });
});

describe('Objects', () => {
    it('should resolve links inside object', () => {
        const schem = {
            a: '@a',
            d: '@/b/c/d',
            c: {
                d: {
                    e: '@c'
                }
            }
        };
        expect(syncDataParser({ schema, data })).toEqual({
            a: data.a,
            d: data.b.c.d,
            c: {
                d: {
                    e: data.c
                }
            }
        });
    });

    it('should parse object', () => {
        const schem = '{ b: @c }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ b: data.c });
    });

    it('should parse object with primitive values', () => {
        const schem = '{ b: qwerty }';
        expect(syncDataParser({ schema, data })).toEqual({ b: 'qwerty' });
    });

    it('should parse nested object', () => {
        const schem = '{ b: {c: @c } }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ b: { c: data.c } });
    });

    it('should parse nested object with arrays', () => {
        const schem = '{ b: {c: [@a] } }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ b: { c: [ data.a ] } });
    });

    it('should parse arrays of objects', () => {
        const schem = '[ { a: @a }, { b: { c: { d: @b/c/d } } } ]';
        expect(syncDataParser({ schema, data })).toEqual([ { a: data.a }, { b: { c: { d: data.b.c.d } } } ]);
    });

    it('should throw parse error if number of parenthesis mismatch', () => {
        const schem = '{{ b: @c }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });

    it('should throw parse error if number of parenthesis mismatch 2', () => {
        const schem = '{ a';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });

    it('should throw parse error if there are no key on object', () => {
        const schem = '{ @a }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY);
    });

    it('should throw parse error if a key is not a string', () => {
        const schem = '{ @c: @a }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY_STRING);
    });

    it('should throw parse error if object key is not correct 1', () => {
        const schem = '{ a asd a: @c }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY);
    });

    it('should throw parse error if object key is not correct 2', () => {
        const schem = '{ a~&a: @c }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY);
    });

    it('should throw parse error if object key is not correct 3', () => {
        const schem = '{ : @c }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY);
    });

    it('should throw parse error if value is incorrect 1', () => {
        const schem = '{ a: a-1 }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_VALUE);
    });

    it('should throw parse error if value is incorrect 2', () => {
        const schem = '{ a: a 1 }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_VALUE);
    });

    it('should throw parse error if value is incorrect 3', () => {
        const schem = '{ a:}';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_VALUE);
    });
});

describe('Extended object functionality', () => {
    it('Functions in object\'s key.', () => {
        const schem = '{ $formatLowercase(KEY): value }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ key: 'value' });
    });
    it('Expressions in object\'s key.', () => {
        const schem = '{ (key): value }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ key: 'value' });
    });
    it('Links in object\'s key.', () => {
        const schem = '{ @detail/personalManager: value }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ [data.detail.personalManager]: 'value' });
    });
    it('Escaping in object\'s key.', () => {
        const schem = '{ key\\$key: value }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ 'key$key': 'value' });
    });
    it('Complex #001', () => {
        const schem = '{ key$formatLowercase(KEY)key: value }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ keykeykey: 'value' });
    });
    it('Complex #002', () => {
        const schem = '{ key(key)key: value }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ keykeykey: 'value' });
    });
    it('Complex #003', () => {
        const schem = '{ key(@detail/personalManager)key: value }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ ['key' + data.detail.personalManager + 'key']: 'value' });
    });
    it('Errors: nesting #001', () => {
        const schem = '{ a{:}';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });
    it('Errors: nesting #002', () => {
        const schem = '{ a}:}';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });
    it('Errors: nesting #003', () => {
        const schem = '{ a';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });
    it('Errors: nesting #003', () => {
        const schem = '{ a$:}';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.FUNCTION_NAMING);
    });
    it('Errors: object key error', () => {
        const schem = '{ a):}';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY);
    });
    it('Errors: key string 001', () => {
        const schem = '{ @b/c: value }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY_STRING);
    });
    it('Errors: key string 002', () => {
        const schem = '{ $getObject(): value }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY_STRING);
    });
});

describe('Tokens', () => {
    it('should substitute token', () => {
        const schem = '@b/:index/d';
        expect(syncDataParser({ schema, data, tokens: { index: 'c' } }))
            .toEqual(data.b.c.d);
    });

    it('should substitute token on the end', () => {
        const schem = '@b/:index';
        expect(syncDataParser({ schema, data, tokens: { index: 'c' } }))
            .toEqual(data.b.c);
    });

    it('should return data from array by token', () => {
        const schem = '@g/:index/a';
        const index = 1;
        expect(syncDataParser({ schema, data, tokens: { index } }))
            .toEqual(data.g[index].a);
    });

    it('should substitute 0 as default token index', () => {
        const schem = '@g/:index/a @g/:index/a';
        expect(syncDataParser({ schema, data }))
            .toEqual(`${data.g[0].a} ${data.g[0].a}`);
    });
});

describe('Freaking tests', () => {
    it('Freaking case 1', () => {
        const schem = '{b: [   { a: @a}, [@c ] ]}';
        expect(syncDataParser({ schema, data })).toEqual({ b: [ { a: data.a }, [ data.c ] ] });
    });

    it('Freaking case 2', () => {
        const schem = '[{b: [{a: @a}, [@c]]}]';
        expect(syncDataParser({ schema, data })).toEqual([ { b: [ { a: data.a }, [ data.c ] ] } ]);
    });

    it('Freaking case 3', () => {
        const schem = '{a: @ a}';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.LINK);
    });

    it('Freaking case 4', () => {
        const schem = {
            a: [ '@b', '$formatUppercase(@a)' ],
            b: { b: '@b', c: [ '@c' ] },
            xxx: '{b: [   { a  : @a}, [@c ] ]}'
        };
        expect(syncDataParser({ schema, data })).toEqual({
            a: [ data.b, renderFunctions.formatUppercase(data.a) ],
            b: { b: data.b, c: [ data.c ] },
            xxx: { b: [ { a: data.a }, [ data.c ] ] }
        });
    });
});

const timeMeasurement = (data, sche) => {
    let totalTime = 0;
    for (let i = 0; i <= 10000; i++) {
        const localStart = performance.now();
        syncDataParser({ schema, data });
        const localEnd = performance.now();
        totalTime += localEnd - localStart;
    }
    const averageTime = totalTime / 10000;
    return {
        totalTime,
        averageTime
    };
};

const test = (total, average, expectTotal) => {
    // eslint-disable-next-line
    console.info(`[time total]: ${total}ms`)
    // eslint-disable-next-line
    console.info(`[time average]: ${average}ms`)
    expect(total).toBeLessThan(expectTotal);
};
describe('Timing tests', () => {
    it('link parser time testing', () => {
        const schem = '@a';
        const { totalTime, averageTime } = timeMeasurement(data, schema);
        test(totalTime, averageTime, 100);
    });
    it('plain parser time testing', () => {
        const schem = '`@a`';
        const { totalTime, averageTime } = timeMeasurement(data, schema);
        test(totalTime, averageTime, 100);
    });
    it('expression parser time testing', () => {
        const schem = '(a)';
        const { totalTime, averageTime } = timeMeasurement(data, schema);
        test(totalTime, averageTime, 100);
    });
    it('function parser time testing', () => {
        const schem = '$formatUppercase(a)';
        const { totalTime, averageTime } = timeMeasurement(data, schema);
        test(totalTime, averageTime, 100);
    });
    it('array parser time testing', () => {
        const schem = '[a, b]a';
        const { totalTime, averageTime } = timeMeasurement(data, schema);
        test(totalTime, averageTime, 100);
    });
    it('object parser time testing', () => {
        const schem = '{a: c, b: d}';
        const { totalTime, averageTime } = timeMeasurement(data, schema);
        test(totalTime, averageTime, 100);
    });
    it('should parse 10000 complex for less than 0.3sec', () => {
        const schem = '[{ b: [{ a  : $formatUppercase(@a)}, [@c]], a: [$formatUppercase(@b/c/d)] }]';
        const { totalTime, averageTime } = timeMeasurement(data, schema);
        test(totalTime, averageTime, 300);
    });
});