import React from 'react';
import { shallow, mount, render } from 'enzyme';
import Sections from '../index';
import * as asyncComputations from '../../../computations/async_computations';
import * as functions from '../../../computations/functions';
import { syncDataParser, MODE } from '../../../data_parser/v5';
import ValidationError from '../../../computations/handler/errors/validation_error';

const components = {
    fields: {
        // components collection must contain a DefaultField component.
        DefaultField: (props) => {
            const { parsedSchema, context, computations } = props
            const { _computations_, _objectId_, ...others } = parsedSchema
            const { _value_, id } = syncDataParser({ schema: { _objectId_, ...others }, data: context, functions: computations, mode: MODE.FULL_SHALLOW });
            return <div className="DefaultField" id={id}>
                <p>DefaultField</p>
                <p id="defaultFieldValue">{_value_}</p>
            </div>;
        },
        AdditionalField: (props) => {
            return <div className="AdditionalFieldClassName">AdditionalField</div>
        },
        FieldWithOnClickAndErrorMessages: (props) => {
            const { handlers: { onClick } = {}, errors, parsedSchema, context, computations } = props;
            const { _value_ } = syncDataParser({ schema: parsedSchema, data: context, functions: computations, mode: MODE.FULL_SHALLOW })
            return <div className="FieldWithOnClickAndErrorMessagesClassName">
                <p>FieldWithOnClickAndErrorMessages</p>
                <button id="Button01" onClick={() => onClick({ target: { value: _value_ } })}>SomeButton</button>
                {
                    errors && Array.isArray(errors) && errors.length
                        ? <div id="ErrorMessagesInOnClickField">{errors.map((error) => {
                            return <p>{error}</p>;
                        })}</div>
                        : null
                }
            </div>
        }
    },
    sections: {
        // components collection must contain a DefaultSection component.
        DefaultSection: (props) => {
            const { fields, sections, parsedSchema, context } = props;
            const { id } = syncDataParser({ schema: parsedSchema, data: context, functions: computations, mode: MODE.FULL_SHALLOW });
            return <div className="DefaultSection" id={id}>
                <p>DefaultSection</p>
                {sections}
                {fields}
            </div>;
        },
        AdditionalSection: (props) => {
            const { fields, sections } = props;
            return <div className="AdditionalSectionClassName">
                {sections}
                {fields}
            </div>
        }
    }
};

const mockedComputation = jest.fn((input, env) => {
    return input;
});

const computations = {
    // builtin computations
    ...functions,
    ...asyncComputations,
    simpleFunction: jest.fn(value => value),
    computationWithValidationError: () => {
        return (input, env) => {
            throw new ValidationError('Test validation error!');
        }
    },
    mockedFunctionComputation: jest.fn(() => {
        return mockedComputation;
    })
};

const styles = {};

const history = { // from react router
    location: {
        search: '?param=A&param2=B'
    }
};
const location = {}; // from react router
const match = {}; // from react router

const generalData = {
    key: 'value',
    array: [
        'firstValue',
        'secondValue'
    ],
    some: {
        boolean: {
            value: false
        }
    },
    list: [
        {
            key: 'first'
        },
        {
            key: 'second'
        },
        {
            key: 'third'
        }
    ],
    list2: [
        {
            key: 'first',
            subList: [
                {
                    key: 'firstFirst'
                }
            ]
        },
        {
            key: 'second',
            subList: [
                {
                    key: 'secondFirst'
                },
                {
                    key: 'secondSecond'
                },
                {
                    key: 'secondThird'
                },
            ]
        },
        {
            key: 'third',
            subList: []
        }
    ]
};

describe('Sections/v4', () => {
    console.error = jest.fn();
    console.warn = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    })

    it('Empty data and empty schema', () => {
        const schema = {};
        const sections = mount(<Sections data={{}} schema={schema} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} />);
        expect(sections.find('.DefaultSection').length).toEqual(1);
        expect(sections.find('.DefaultField').length).toEqual(0);
    })

    it('Simple schema: with nested fields', () => {
        const schema = { // DefaultSection
            _fields_: [
                { // DefaultField
                    _value_: '@key'
                }
            ]
        };
        const sections = mount(<Sections data={generalData} schema={schema} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} />);
        expect(sections.find('.DefaultSection').length).toEqual(1);
        expect(sections.find('.DefaultField').length).toEqual(1);
        expect(sections.find('#defaultFieldValue').text()).toEqual(generalData.key);
    })

    it('With nested sections and fields', () => {
        const schema = { // DefaultSection
            _sections_: [
                { // DefaultSection
                    _fields_: [
                        { // DefaultField
                            id: 'first',
                            _value_: '@array/0'
                        },
                        { // DefaultField
                            id: '$simpleFunction(`second`)',
                            _value_: "$simpleFunction(@array/1)"
                        }
                    ]
                }
            ],
            _fields_: [
                { // DefaultField
                    id: 'third',
                    _value_: '@key'
                }
            ]
        };
        const sections = mount(<Sections data={generalData} schema={schema} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} />);
        expect(sections.find('.DefaultSection').length).toEqual(2);
        expect(sections.find('.DefaultField').length).toEqual(3);
        expect(sections.find(`#first`).find('#defaultFieldValue').text()).toEqual(generalData.array[0]);
        expect(sections.find(`#second`).find('#defaultFieldValue').text()).toEqual(generalData.array[1]);
        expect(sections.find(`#third`).find('#defaultFieldValue').text()).toEqual(generalData.key);
        expect(computations.simpleFunction).toHaveBeenCalledTimes(2);
    })

    it('Visibility', () => {
        const schema = {
            id: 'TopSection', // visible
            _sections_: [
                { // visible
                    id: 'NestedSectionFirst',
                    _fields_: [
                        { // invisible
                            id: 'firstField',
                            _value_: '@array/0',
                            _visible_: false
                        },
                        { // invisible
                            id: '$simpleFunction(`secondField`)',
                            _value_: "$simpleFunction(@array/1)",
                            _visible_: "@some/boolean/value"
                        },
                        { // visible
                            id: "thirdField",
                            _value_: "(@array/0)-(@array/1)"
                        }
                    ]
                },
                { // invisible
                    id: 'NestedSectionSecond',
                    _fields_: [
                        { // inivisble, because the parent is invisible.
                            id: "fourthField",
                            _value_: "`some literal value`"
                        }
                    ],
                    _visible_: false
                }
            ],
            _fields_: [
                { // visible
                    id: 'fifthField',
                    _value_: '@key',
                    _visible_: '$simpleFunction(true)'
                }
            ]
        };
        const sections = mount(<Sections data={generalData} schema={schema} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} />);
        expect(sections.find('.DefaultSection').length).toEqual(2);
        expect(sections.find('.DefaultField').length).toEqual(2);
        expect(sections.exists('#firstField')).toBeFalsy();
        expect(sections.exists('#secondField')).toBeFalsy();
        expect(sections.exists('#fourthField')).toBeFalsy();
        expect(sections.exists('#thirdField')).toBeTruthy();
        expect(sections.exists('#fifthField')).toBeTruthy();
        expect(sections.exists('#TopSection')).toBeTruthy();
        expect(sections.exists('#NestedSectionFirst')).toBeTruthy();
        expect(sections.exists('#NestedSectionSecond')).toBeFalsy();
    })

    it('Not default components (sections and fields)', () => {
        const schema = {
            _type_: "AdditionalSection", // type of section component
            _sections_: [
                {
                    _type_: "$simpleFunction(`AdditionalSection`)", // type of section component, may be a complex expression.
                    _fields_: [
                        {
                            _type_: "AdditionalField", // type of field component
                            _value_: "some value"
                        },
                        { // default field
                            _value_: "@key"
                        }
                    ]
                },
                {
                    _type_: "ComponentDoesNotExists", // DefaultComponent
                    id: 'ComponentDoesNotExistsID'
                },
                { // DefaultComponent
                    id: 'DefaultComponentID'
                }
            ]
        };
        const sections = mount(<Sections data={generalData} schema={schema} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} />);
        expect(sections.find('.DefaultSection').length).toEqual(2);
        expect(sections.find('.AdditionalSectionClassName').length).toEqual(2);
        expect(sections.find('.DefaultField').length).toEqual(1);
        expect(sections.find('.AdditionalFieldClassName').length).toEqual(1);
    })

    it('Error if DefaultSection and/or DefaultField does not exist', () => {
        const schema1 = {};
        const schema2 = {
            _fields_: [
                {
                    id: 'SomeId',
                    _value_: '@key'
                }
            ]
        };
        const sections1 = () => mount(<Sections data={generalData} schema={schema1} computations={computations} sectionComponents={{}} fieldComponents={components.fields} />);
        const sections2 = () => mount(<Sections data={generalData} schema={schema2} computations={computations} sectionComponents={components.sections} fieldComponents={{}} />);
        expect(sections1).toThrow(Error);
        expect(sections2).toThrow(Error);
    })

    it('Error if nested sections or fields are passed in a field block', () => {
        const schema1 = {
            _fields_: [
                {
                    _sections_: [ {} ] // invalid
                }
            ]
        };
        const schema2 = {
            _fields_: [
                {
                    _fields_: [ {} ] // invalid
                }
            ]
        };
        const sections1 = () => mount(<Sections data={generalData} schema={schema1} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} />);
        const sections2 = () => mount(<Sections data={generalData} schema={schema2} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} />);
        expect(sections1).toThrow(Error);
        expect(sections2).toThrow(Error);
    })

    it('FormId is necessary for computations processing', () => {
        const schema = {
            // _formId_: 'some-string-schema-id', 
            _fields_: [
                {
                    _type_: "$simpleFunction(FieldWithOnClickAndErrorMessages)",
                    _value_: "@key",
                    _computations_: {
                        _handlers_: {
                            _onClick_: [
                                '$setValue()'
                            ]
                        }
                    }
                }
            ]
        };
        const sections = mount(<Sections data={generalData} schema={schema} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} />);
        const button = sections.find('#Button01');
        const fn = () => button.simulate('click');
        expect(fn).toThrow(Error);
        expect(fn).toThrowError('SectionsComputations: formId must be defined.');
    })

    it('OnClick computations processing', async () => {
        const schema = {
            _formId_: 'some-string-schema-id', 
            _fields_: [
                {
                    _type_: "$simpleFunction(FieldWithOnClickAndErrorMessages)",
                    _value_: "@key",
                    _computations_: {
                        _handlers_: {
                            _onClick_: [
                                '$mockedFunctionComputation()', // test
                                '$setValue()' // write the passed value to the context.
                            ]
                        }
                    }
                }
            ]
        };
        const sections = mount(<Sections data={generalData} schema={schema} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} history={history} location={location} match={match} />);
        sections.find('#Button01').simulate('click');
        await new Promise((resolve) => setTimeout(resolve));

        expect(computations.mockedFunctionComputation).toBeCalledTimes(1);
        expect(mockedComputation).toBeCalledTimes(1);
        expect(mockedComputation.mock.calls[0][0]).toEqual({
            value: generalData.key,
            dataLink: expect.any(String)
        });
        expect(mockedComputation.mock.calls[0][1]).toMatchObject({
            context: expect.any(Object),
            updateState: expect.any(Function),
            currentSchemaObject: expect.any(Object),
            schema: expect.any(Object),
            computations: expect.any(Object),
            match,
            location
        });
    })

    it('Validation error and error messages', async () => {
        const schema = {
            _formId_: 'validation-error', 
            _fields_: [
                {
                    _type_: "FieldWithOnClickAndErrorMessages",
                    _value_: "@key",
                    _computations_: {
                        _handlers_: {
                            _onClick_: [
                                '$computationWithValidationError()', // this function checks the passed input value and throws ValidationError.
                                '$setValue()'
                            ]
                        }
                    }
                }
            ]
        };
        const sections = mount(<Sections data={generalData} schema={schema} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} histor={history} location={location} match={match} />);
        sections.find('#Button01').simulate('click');
        await new Promise((resolve) => setTimeout(resolve));
        sections.update();

        const errorMessages = sections.find('div#ErrorMessagesInOnClickField');
        expect(errorMessages.length).toEqual(1);
        expect(errorMessages.contains(<p>Test validation error!</p>)).toBeTruthy();
    })

    it('Templates: simple example', () => {
        const schema = {
            _sections_: { // this template will be converted to a list of the AdditionalSection component
                _dataLink_: "@/list",
                _template_: {
                    _type_: "AdditionalSection",
                    _fields_: [
                        {
                            _value_: "@key",
                            id: '@key'
                        }
                    ]
                }
            }
        };
        const sections = mount(<Sections data={generalData} schema={schema} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} histor={history} location={location} match={match} />);
        const additionalSections = sections.find('div.AdditionalSectionClassName');
        const defaultFields = sections.find('div.DefaultField');
        expect(additionalSections.length).toEqual(generalData.list.length);
        expect(defaultFields.length).toEqual(generalData.list.length);
        expect(defaultFields.at(0).find('#defaultFieldValue').text()).toEqual(generalData.list[0].key);
        expect(defaultFields.at(1).find('#defaultFieldValue').text()).toEqual(generalData.list[1].key);
        expect(defaultFields.at(2).find('#defaultFieldValue').text()).toEqual(generalData.list[2].key);
    })

    it('Templates: nested templates', () => {
        const schema = {
            _sections_: { // this template will be converted to a list of the AdditionalSection components
                _dataLink_: "@/list2",
                _template_: {
                    _type_: "AdditionalSection",
                    _fields_: { // nested template, this template will be converted to a list of the DefaultField components
                        _dataLink_: '@subList', // the same as the next link: @/list2/subList
                        _template_: {
                            _value_: "@key"
                        }
                    }
                }
            }
        };
        const sections = mount(<Sections data={generalData} schema={schema} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} histor={history} location={location} match={match} />);
        const additionalSections = sections.find('div.AdditionalSectionClassName');
        const defaultFields = sections.find('div.DefaultField');
        expect(additionalSections.length).toEqual(generalData.list2.length);
        expect(defaultFields.length).toEqual(generalData.list2[0].subList.length + generalData.list2[1].subList.length + generalData.list2[2].subList.length);
        expect(defaultFields.at(0).find('#defaultFieldValue').text()).toEqual(generalData.list2[0].subList[0].key);
        expect(defaultFields.at(1).find('#defaultFieldValue').text()).toEqual(generalData.list2[1].subList[0].key);
        expect(defaultFields.at(2).find('#defaultFieldValue').text()).toEqual(generalData.list2[1].subList[1].key);
        expect(defaultFields.at(3).find('#defaultFieldValue').text()).toEqual(generalData.list2[1].subList[2].key);
        // generalData.list2[2].subList is empty list
    })

    it('Templates: data for template must be an array', () => {
        const schema = {
            _sections_: {
                _dataLink_: "@/some/boolean/value",
                _template_: {
                    _type_: "AdditionalSection",
                    _fields_: [
                        {
                            _value_: "@key",
                            id: '@key'
                        }
                    ]
                }
            }
        };
        const fn = () => mount(<Sections data={generalData} schema={schema} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} histor={history} location={location} match={match} />);
        expect(fn).toThrow(Error);
        expect(fn).toThrowError('DataParserV4: data for template must be an array.');
    })

    it('Templates: template for sections must be an object', () => {
        const schema = {
            _sections_: {
                _dataLink_: "@/list",
                _template_: [] // must be an object
            }
        };
        const fn = () => mount(<Sections data={generalData} schema={schema} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} histor={history} location={location} match={match} />);
        expect(fn).toThrow(Error);
        expect(fn).toThrowError('DataParserV4: template must be an object (sectionsMode).');
    })

    it('Templates: template for fields must be an object', () => {
        const schema = {
            _fields_: {
                _dataLink_: "@/list",
                _template_: [] // must be an object
            }
        };
        const fn = () => mount(<Sections data={generalData} schema={schema} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} histor={history} location={location} match={match} />);
        expect(fn).toThrow(Error);
        expect(fn).toThrowError('DataParserV4: template must be an object (fieldsMode).');
    })

    it('Templates: data for template must be an array of objects or arrays', () => {
        const schema = {
            _fields_: {
                _dataLink_: "@/array", // list of strings
                _template_: {
                    _type_: "AdditionalSection",
                    _fields_: [
                        {
                            _value_: "@key",
                            id: '@key'
                        }
                    ]
                }
            }
        };
        const fn = () => mount(<Sections data={generalData} schema={schema} computations={computations} sectionComponents={components.sections} fieldComponents={components.fields} histor={history} location={location} match={match} />);
        expect(fn).toThrow(Error);
        expect(fn).toThrowError('DataParserV4: each template data item must be an object or an array.');
    })

})