import React from 'react';
import { shallow, mount, render } from 'enzyme';
import Sections from '../index';
import * as asyncComputations from '../../../computations/async_computations';
import * as functions from '../../../computations/functions';
import { syncDataParser, MODE } from '../../../data_parser/v5';

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

const computations = {
    // builtin computations
    ...functions,
    ...asyncComputations,
    simpleFunction: jest.fn(value => value)
};

const styles = {};

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
    }
};

describe('Sections/v4', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.error = jest.fn();
        console.warn = jest.fn();
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

})