import { syncDataParser, asyncDataParser, genDataParser } from './index';
import { DataParserError } from '../../data_link_parser/v2/data_parser_error';

const schemaCallbacksCollection = {
    formatUppercase: s => s.toUpperCase(),
    formatLowercase: s => s.toLowerCase(),
    contextualFunction: function () {
        return schemaCallbacksCollection.formatUppercase(this.a);
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
    commaSeparatedParams: function (...args) {
        let res = 'test_';
        for (let i = 0; i < args.length; i++) {
            res += args[i];
        }
        return res;
    },
    emptyParams: jest.fn(() => 'done'),
    asyncFunction: (thrw = false) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => thrw ? reject(new Error('Test error')) : resolve('async result'), 100)
        })
    },
    asyncFunction2: (param) => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(param), 100);
        })
    },
    throwError: () => {
        throw new Error('Unknown error.');
    }
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
        const result = {
            key: 'string',
            _dataLink_: data.b,
            _section_: {
                key: data.b.c.d,
                key2: data.b.c.d
            }
        };
        const result = syncDataParser({ schema, data });
        expect(result).toEqual(result);
    });

    it('special cases #1: schema is undefined', () => {
        const result = syncDataParser({ data });
        expect(result).toEqual(void 0);
    });

    it('special cases #2: data is not an object or an array', () => {
        // todo: should be clarified...
        const schema = [ 1, 'string', null ];
        const dataValues = [
            null,
            'string',
            NaN,
            false,
            100,
            Symbol('symbol'),
            new Date(),
            () => {},
            async () => {},
            Promise.resolve('v'),
            function* () {}
        ];
        for (const data of dataValues) {
            const fn = () => syncDataParser({ schema: schema, data });
            // expect(fn).toThrowError(Error);
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
            _sections_: [
                {
                    key: data.g[0].b
                },
                {
                    key: data.g[1].b
                }
            ]
        };
        const result = syncDataParser({ schema, data });
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
        const schema = '1, qwerty';
        expect(syncDataParser({ schema, data }))
            .toEqual(schema
);
    });

    it('should get data by local key', () => {
        const schema = '@a';
        expect(syncDataParser({ schema, data }))
            .toEqual(data.a);
    });

    it('should get data by local composite key', () => {
        const schema = '@b/c/d/';
        expect(syncDataParser({ schema, data }))
            .toEqual(data.b.c.d);
    });

    it('should get data by global key', () => {
        const schema = '@/a';
        expect(syncDataParser({ schema, data: data.c, rootData: data }))
            .toEqual(data.a);
    });

    it('should return object if this is the only variable in a link', () => {
        const schema = '@b';
        expect(syncDataParser({ schema, data }))
            .toEqual(data.b);
    });

    it('should understand complex links with text and escaped symbols', () => {
        const schema = '@a @b/c/d 100\\$';
        expect(syncDataParser({ schema, data }))
            .toEqual(`${data.a} ${data.b.c.d} 100$`);
    });

    it('should get default value if it can not find value or wrong path', () => {
        const schema = '@a/b/c/d';
        const defaultValue = 'default value';
        expect(syncDataParser({ schema, data, defaultValue }))
            .toEqual(defaultValue);
    });

    it('should return undefined when data is not accessible by given path / wrong path', () => {
        const schema = '@a/b/c/d';
        const value = syncDataParser({ schema, data });
        expect(value === undefined).toBeTruthy();
    });

    it('should parse as plain string if it is escaped by ``', () => {
        const schema = '@a/b/c/d';
        expect(syncDataParser({ schema: `\`${schema}\``, data })).toEqual(schema);
    });

    it('an escaped symbol ` inside a plain string (rounded by ``) should be parsed as plain', () => {
        const schema = '\\`@a';
        expect(syncDataParser({ schema: `\`${schema}\``, data })).toEqual('`@a');
    });
});

describe('Extended link functionality', () => {
    it('Functions in a link: evaluate a new key #01', () => {
        const schema = '@b/$getCKey()/d';
        expect(syncDataParser({ schema, data, functions: schemaCallbacksCollection }))
            .toEqual(data.b.c.d);
    });
    it('Functions in a link: evaluate a new key #02', () => {
        const schema = '@b/$formatLowercase(@someBKey)/d';
        expect(syncDataParser({ schema, data, functions: schemaCallbacksCollection }))
            .toEqual(data.b.c.d);
    });
    it('Functions in a link: evaluate a new key #03', () => {
        const schema = '@b/$formatLowercase(@/someRootKey)/d';
        expect(syncDataParser({ schema, data, functions: schemaCallbacksCollection }))
            .toEqual(data.b.c.d);
    });
    it('Functions in a link: evaluate a middleware object #01', () => {
        const schema = '@b/$getObject()/key/key2'; // function returns not string.
        const fn = () => syncDataParser({ schema, data, functions: schemaCallbacksCollection })
        expect(fn).toThrowError(DataParserError);
    });
    it('Expressions in a link: simple expression', () => {
        const schema = '@b/(c)/d';
        expect(syncDataParser({ schema, data })).toEqual(data.b.c.d);
    });
    it('Expressions in a link: complex expression #1', () => {
        const schema = '@b/(k(@c/d))/ke';
        expect(syncDataParser({ schema, data })).toEqual(data.b.kd.ke);
    });
    it('Expressions in a link: complex expression #2', () => {
        const schema = '@b/(k($formatLowercase(@/bigD)))/ke';
        expect(syncDataParser({ schema, data, functions: schemaCallbacksCollection })).toEqual(data.b.kd.ke);
    });
    it('Expressions in a link: complex expression #3', () => {
        // todo: should be clarified...
        const schema = '@b/(@c/d, @someBKey)';
        expect(syncDataParser({ schema, data })).toEqual(void 0);
    });
    it('Objects in a link', () => {
        const schema = '@b/{d: @c/d, someBKey: @someBKey}';
        const fn = () => syncDataParser({ schema, data })
        expect(fn).toThrowError(DataParserError);
    });
    it('Arrays in a link', () => {
        const schema = '@b/[@c/d, @kd/ke, @/bigD]';
        const fn = () => syncDataParser({ schema, data })
        expect(fn).toThrowError(DataParserError);
    });
    it('Index array of objects', () => {
        const schema = '@g/<index>';
        const result = data.g.map((item, i) => {
            item.index = i;
            return item;
        });
        expect(syncDataParser({ schema, data })).toEqual(result);
    });
    it('Errors: index must be the last part of a link', () => {
        const schema = '@g/<index>/a';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError.ERRORS.INDEX_LAST);
    });
    it('Errors: incorrect index name.', () => {
        const schema = '@g/<$index>';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError.ERRORS.INDEX_NAME);
    });
    it('Errors: empty index name.', () => {
        const schema = '@g/<>';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError.ERRORS.INDEX_EMPTY);
    });
    it('Errors: index of not array data.', () => {
        const schema = '@b/<index>';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError.ERRORS.INDEX_NOT_ARRAY_DATA);
    });
    it('Errors: index should be a standalone part of a link.', () => {
        const schema = '@g/<index>key';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError.ERRORS.INDEX_PART);
    });
});

describe('Expressions', () => {
    it('should resolve empty expression as an empty string', () => {
        const schema = '()';
        expect(syncDataParser({ schema, data })).toEqual('');
    });

    it('should resolve expressions locally', () => {
        const schema = '(@a)b';
        expect(syncDataParser({ schema, data })).toEqual(`${data.a}b`);
    });

    it('should resolve whitespace in expressions', () => {
        const schema = '(@a @e)b';
        expect(syncDataParser({ schema, data })).toEqual(`${data.a} ${data.e}b`);
    });

    it('should resolve whitespace and comma in expressions', () => {
        const schema = '(@a, @e)b';
        expect(syncDataParser({ schema, data })).toEqual(`${data.a}, ${data.e}b`);
    });

    it('should trim whitespaces at start and end of the expression', () => {
        const schema = '( @a, @e )b';
        expect(syncDataParser({ schema, data })).toEqual(`${data.a}, ${data.e}b`);
    });

    it('should resolve nested expressions and drop spaces at the start and the end of an expression', () => {
        const schema = '((     )((@a )+ ) )b';
        expect(syncDataParser({ schema, data })).toEqual(`${data.a}+b`);
    });

    it('should throw error if nesting is broken', () => {
        const schema = '()(@a()))\\$';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });
    it('should throw error if nesting is broken #2', () => {
        const schema = '()(@a()';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });
});

describe('Functions', () => {
    it('should work if params list is empty', () => {
        const mock = schemaCallbacksCollection.emptyParams;
        const schema = '$emptyParams()';
        const result = syncDataParser({ schema, data, functions: schemaCallbacksCollection });
        expect(typeof mock.mock.calls[0][0])
            .toEqual('undefined');
        expect(result)
            .toEqual(schemaCallbacksCollection.emptyParams());
    });

    it('should work with render functions', () => {
        const schema = '$formatUppercase(@a)';
        expect(syncDataParser({ schema, data, functions: schemaCallbacksCollection }))
            .toEqual(schemaCallbacksCollection.formatUppercase(data.a));
    });

    it('should work with render functions with several comma-separated params', () => {
        const schema = '$commaSeparatedParams(  @a      , [@e, @d]    ,    { f: @f }    )';
        expect(syncDataParser({ schema, data, functions: schemaCallbacksCollection }))
            .toEqual(schemaCallbacksCollection.commaSeparatedParams(data.a, [ data.e, data.d ], { f: data.f }));
    });

    it('should work with two render functions on the same level', () => {
        const schema = '$formatUppercase(@a) $formatUppercase(@b/c/d)';
        expect(syncDataParser({ schema, data, functions: schemaCallbacksCollection }))
            .toEqual(`${schemaCallbacksCollection.formatUppercase(data.a)} ${schemaCallbacksCollection.formatUppercase(data.b.c.d)}`);
    });

    it('should work with nested render functions', () => {
        const schema = '$formatLowercase($formatUppercase(@a))';
        expect(syncDataParser({ schema, data, functions: schemaCallbacksCollection }))
            .toEqual(schemaCallbacksCollection.formatLowercase(schemaCallbacksCollection.formatUppercase(data.a)));
    });

    it('should throw an error if function has incorrect name', () => {
        const schema = '$form*&atUppercase';
        const f = () => syncDataParser({ schema, data, functions: schemaCallbacksCollection });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.FUNCTION_NAMING);
    });

    it('should throw an exception if function is not found', () => {
        const schema = '$formatQwerty(@a)';
        const f = () => syncDataParser({ schema, data, functions: schemaCallbacksCollection });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.FUNCTION_UNKNOWN);
    });
});

describe('Arrays', () => {
    it('should resolve primary values inside array', () => {
        const schema = [ 1, '1', true, null ];
        expect(syncDataParser({ schema, data }))
            .toEqual([ 1, '1', true, null ]);
    });

    it('should resolve links inside array', () => {
        const schema = [ '@a', '@c', '@d' ];
        expect(syncDataParser({ schema, data }))
            .toEqual([ data.a, data.c, data.d ]);
    });

    it('should resolve link as array (with a lot of white spaces)', () => {
        const schema = '[     @b/c/d     ,      @c     ]';
        expect(syncDataParser({ schema, data }))
            .toEqual([ data.b.c.d, data.c ]);
    });

    it('the DataParserError.ARRAY_VALUE error should be thrown when there is a white space inside an array\'s value', () => {
        const schema = '[foo bar]';
        const fn = () => syncDataParser({ schema, data });
        expect(fn).toThrowError(DataParserError.ERRORS.ARRAY_VALUE);
    });

    it('should parse array with primitive values', () => {
        const schema = '[@a, qwerty, foo, bar, true, false, null]';
        expect(syncDataParser({ schema, data }))
            .toEqual([ data.a, 'qwerty', 'foo', 'bar', true, false, null ]);
    });

    it('should resolve link as nested array', () => {
        const schema = '[[@a, [@c]], [@a, @d]]';
        expect(syncDataParser({ schema, data }))
            .toEqual([ [ 'a', [ true ] ], [ 'a', null ] ]);
    });

    it('should convert array into renderFunction arguments', () => {
        const schema = '$formatPlus([@b/c/d, @f])';
        expect(syncDataParser({ schema, data, functions: schemaCallbacksCollection }))
            .toEqual(schemaCallbacksCollection.formatPlus([ data.b.c.d, data.f ]));
    });

    it('should resolve link as array and use renderFunction if needed', () => {
        const schema = '[$formatUppercase(@a), $formatUppercase(@b/c/d)]';
        expect(syncDataParser({ schema, data, functions: schemaCallbacksCollection }))
            .toEqual([ schemaCallbacksCollection.formatUppercase(data.a), schemaCallbacksCollection.formatUppercase(data.b.c.d) ]);
    });

    it('should throw array value arror', () => {
        const schema = '[1-5]';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.ARRAY_VALUE);
    });

    it('should throw nesting error if number of parenthesis mismatch 1', () => {
        const schema = '[[@a]';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });

    it('should throw nesting error if number of parenthesis mismatch 2', () => {
        const schema = '[@a]]';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });
});

describe('Objects', () => {
    it('should resolve links inside object', () => {
        const schema = {
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
        const schema = '{ b: @c }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ b: data.c });
    });

    it('should parse object with primitive values', () => {
        const schema = '{ b: qwerty }';
        expect(syncDataParser({ schema, data })).toEqual({ b: 'qwerty' });
    });

    it('should parse nested object', () => {
        const schema = '{ b: {c: @c } }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ b: { c: data.c } });
    });

    it('should parse nested object with arrays', () => {
        const schema = '{ b: {c: [@a] } }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ b: { c: [ data.a ] } });
    });

    it('should parse arrays of objects', () => {
        const schema = '[ { a: @a }, { b: { c: { d: @b/c/d } } } ]';
        expect(syncDataParser({ schema, data })).toEqual([ { a: data.a }, { b: { c: { d: data.b.c.d } } } ]);
    });

    it('should throw parse error if number of parenthesis mismatch', () => {
        const schema = '{{ b: @c }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });

    it('should throw parse error if number of parenthesis mismatch 2', () => {
        const schema = '{ a';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });

    it('should throw parse error if there are no key on object', () => {
        const schema = '{ @a }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY);
    });

    it('should throw parse error if a key is not a string', () => {
        const schema = '{ @c: @a }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY_STRING);
    });

    it('should throw parse error if object key is not correct 1', () => {
        const schema = '{ a asd a: @c }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY);
    });

    it('should throw parse error if object key is not correct 2', () => {
        const schema = '{ a~&a: @c }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY);
    });

    it('should throw parse error if object key is not correct 3', () => {
        const schema = '{ : @c }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY);
    });

    it('should throw parse error if value is incorrect 1', () => {
        const schema = '{ a: a-1 }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_VALUE);
    });

    it('should throw parse error if value is incorrect 2', () => {
        const schema = '{ a: a 1 }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_VALUE);
    });

    it('should throw parse error if value is incorrect 3', () => {
        const schema = '{ a:}';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_VALUE);
    });
});

describe('Extended object functionality', () => {
    it('Functions in object\'s key.', () => {
        const schema = '{ $formatLowercase(KEY): value }';
        expect(syncDataParser({ schema, data, functions: schemaCallbacksCollection }))
            .toEqual({ key: 'value' });
    });
    it('Expressions in object\'s key.', () => {
        const schema = '{ (key): value }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ key: 'value' });
    });
    it('Links in object\'s key.', () => {
        const schema = '{ @detail/personalManager: value }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ [data.detail.personalManager]: 'value' });
    });
    it('Escaping in object\'s key.', () => {
        const schema = '{ key\\$key: value }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ 'key$key': 'value' });
    });
    it('Complex #001', () => {
        const schema = '{ key$formatLowercase(KEY)key: value }';
        expect(syncDataParser({ schema, data, functions: schemaCallbacksCollection }))
            .toEqual({ keykeykey: 'value' });
    });
    it('Complex #002', () => {
        const schema = '{ key(key)key: value }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ keykeykey: 'value' });
    });
    it('Complex #003', () => {
        const schema = '{ key(@detail/personalManager)key: value }';
        expect(syncDataParser({ schema, data }))
            .toEqual({ ['key' + data.detail.personalManager + 'key']: 'value' });
    });
    it('Errors: nesting #001', () => {
        const schema = '{ a{:}';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });
    it('Errors: nesting #002', () => {
        const schema = '{ a}:}';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });
    it('Errors: nesting #003', () => {
        const schema = '{ a';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.NESTING);
    });
    it('Errors: nesting #003', () => {
        const schema = '{ a$:}';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.FUNCTION_NAMING);
    });
    it('Errors: object key error', () => {
        const schema = '{ a):}';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY);
    });
    it('Errors: key string 001', () => {
        const schema = '{ @b/c: value }';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY_STRING);
    });
    it('Errors: key string 002', () => {
        const schema = '{ $getObject(): value }';
        const f = () => syncDataParser({ schema, data, functions: schemaCallbacksCollection });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.OBJECT_KEY_STRING);
    });
});

describe('Tokens', () => {
    it('should substitute token', () => {
        const schema = '@b/:index/d';
        expect(syncDataParser({ schema, data, tokens: { index: 'c' } }))
            .toEqual(data.b.c.d);
    });

    it('should substitute token on the end', () => {
        const schema = '@b/:index';
        expect(syncDataParser({ schema, data, tokens: { index: 'c' } }))
            .toEqual(data.b.c);
    });

    it('should return data from array by token', () => {
        const schema = '@g/:index/a';
        const index = 1;
        expect(syncDataParser({ schema, data, tokens: { index } }))
            .toEqual(data.g[index].a);
    });

    it('should substitute 0 as default token index', () => {
        const schema = '@g/:index/a @g/:index/a';
        expect(syncDataParser({ schema, data }))
            .toEqual(`${data.g[0].a} ${data.g[0].a}`);
    });
});

describe('Freaking tests', () => {
    it('Freaking case 1', () => {
        const schema = '{b: [   { a: @a}, [@c ] ]}';
        expect(syncDataParser({ schema, data })).toEqual({ b: [ { a: data.a }, [ data.c ] ] });
    });

    it('Freaking case 2', () => {
        const schema = '[{b: [{a: @a}, [@c]]}]';
        expect(syncDataParser({ schema, data })).toEqual([ { b: [ { a: data.a }, [ data.c ] ] } ]);
    });

    it('Freaking case 3', () => {
        const schema = '{a: @ a}';
        const f = () => syncDataParser({ schema, data });
        expect(f).toThrowError(DataParserError);
        expect(f).toThrowError(DataParserError.ERRORS.LINK);
    });

    it('Freaking case 4', () => {
        const schema = {
            a: [ '@b', '$formatUppercase(@a)' ],
            b: { b: '@b', c: [ '@c' ] },
            xxx: '{b: [   { a  : @a}, [@c ] ]}'
        };
        expect(syncDataParser({ schema, data, functions: schemaCallbacksCollection })).toEqual({
            a: [ data.b, schemaCallbacksCollection.formatUppercase(data.a) ],
            b: { b: data.b, c: [ data.c ] },
            xxx: { b: [ { a: data.a }, [ data.c ] ] }
        });
    });
});

describe('Async data parser', () => {
    it('Async data parser returns a promise', async () => {
        const out = asyncDataParser({ schema: "string" })
        expect(Promise.resolve(out)).toBe(out);
        await expect(out).resolves.toEqual('string');
    })

    it('Parse and call async function in dataLink string #1', async () => {
        const schema = '$asyncFunction()';
        const out = asyncDataParser({ schema, functions: schemaCallbacksCollection });
        await expect(out).resolves.toEqual('async result');
    })

    it('Parse and call async function in dataLink string #2', async () => {
        const schema = '$asyncFunction(true)';
        const out = asyncDataParser({ schema, functions: schemaCallbacksCollection });
        await expect(out).rejects.toThrow('Test error');
    })

    it('Parse and call async function in dataLink string #3', async () => {
        const schema = '$formatUppercase($asyncFunction())';
        const out = asyncDataParser({ schema, functions: schemaCallbacksCollection });
        await expect(out).resolves.toEqual('ASYNC RESULT');
    })

    it('Parse object with async functions in complex expressions', async () => {
        const schema = {
            test1: '$asyncFunction()',
            test2: '$formatUppercase($asyncFunction())',
            test3: '$asyncFunction2(@a)',
            test4: '$asyncFunction2($asyncFunction())',
            test5: '$formatUppercase($asyncFunction2($asyncFunction()))',
            test6: '@b/$asyncFunction2(`c`)/d',
            key: '@a'
        };
        const result = {
            test1: 'async result',
            test2: 'ASYNC RESULT',
            test3: data.a,
            test4: 'async result',
            test5: 'ASYNC RESULT',
            test6: data.b.c.d,
            key: data.a
        };
        const out = asyncDataParser({ schema, data, functions: schemaCallbacksCollection });
        await expect(out).resolves.toEqual(result)
    })

    it('Reject parsing object with a failed async function', async () => {
        const schema = {
            success: '$asyncFunction()',
            fail: '$formatUppercase($asyncFunction(true))'
        };
        const out = asyncDataParser({ schema, functions: schemaCallbacksCollection });
        await expect(out).rejects.toThrow('Test error');
    })

    it('Reject parsing object if unknown error has been occured', async () => {
        const schema = {
            success: '$asyncFunction()',
            fail: '$throwError()'
        };
        const out = asyncDataParser({ schema, functions: schemaCallbacksCollection });
        await expect(out).rejects.toThrow('Unknown error');
    })
})

const timeMeasurement = (data, schema) => {
    let totalTime = 0;
    for (let i = 0; i <= 10000; i++) {
        const localStart = performance.now();
        syncDataParser({ schema, data, functions: schemaCallbacksCollection });
        const localEnd = performance.now();
        totalTime += localEnd - localStart;
    }
    const averageTime = totalTime / 10000;
    return {
        totalTime,
        averageTime
    };
};

describe('Timing tests', () => {
    it('link parser time testing', () => {
        const schema = '@a';
        const { totalTime, averageTime } = timeMeasurement(data, schema);
        expect(totalTime).toBeLessThan(200);
    });
    it('plain parser time testing', () => {
        const schema = '`@a`';
        const { totalTime, averageTime } = timeMeasurement(data, schema);
        expect(totalTime).toBeLessThan(200);
    });
    it('expression parser time testing', () => {
        const schema = '(a)';
        const { totalTime, averageTime } = timeMeasurement(data, schema);
        expect(totalTime).toBeLessThan(200);
    });
    it('function parser time testing', () => {
        const schema = '$formatUppercase(a)';
        const { totalTime, averageTime } = timeMeasurement(data, schema);
        expect(totalTime).toBeLessThan(200);
    });
    it('array parser time testing', () => {
        const schema = '[a, b]a';
        const { totalTime, averageTime } = timeMeasurement(data, schema);
        expect(totalTime).toBeLessThan(200);
    });
    it('object parser time testing', () => {
        const schema = '{a: c, b: d}';
        const { totalTime, averageTime } = timeMeasurement(data, schema);
        expect(totalTime).toBeLessThan(200);
    });
    it('should parse 10000 complex for less than 0.3sec', () => {
        const schema = '[{ b: [{ a  : $formatUppercase(@a)}, [@c]], a: [$formatUppercase(@b/c/d)] }]';
        const { totalTime, averageTime } = timeMeasurement(data, schema);
        expect(totalTime).toBeLessThan(900); // todo: must be faster!!! It is so slow because works under generators.
    });
});