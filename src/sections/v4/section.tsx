import React from 'react';
import { branch, compose, renderNothing, withProps } from 'recompose';

import { strictlyIsObject } from '../../utils';
import { isDataLink } from '../../data_link_parser/utils';
import { syncDataParser } from '../../data_parser/v5';
import { RouteComponentProps } from 'react-router';

import { SectionInterfaces, DataParserInterfaces } from '../../types/types';
import SectionV4 = SectionInterfaces.v4.Section;

const WrappedClientSectionComponent = ({
    parsedSchema,
    level,
    tokenParams,
    context,
    Comp,
    sections,
    fields,
    updateState,
    computations,
    styles,
    sectionNode,
    fieldNode
}: SectionV4.EntryPropsIn & SectionV4.EntryPropsAdditional): JSX.Element => {
    return (
        <Comp
            styles={styles}
            context={context}
            parsedSchema={parsedSchema}
            sections={sections}
            fields={fields}
            tokenParams={tokenParams}
            level={level || 0}
            updateState={updateState}
            computations={computations}
            SectionNode={sectionNode()}
            FieldNode={fieldNode()}
        />
    );
};

/**
 * Sections entry point
 */
export const SectionEntry: React.ComponentClass<SectionV4.EntryPropsIn> = compose<SectionV4.EntryPropsIn & SectionV4.EntryPropsAdditional, SectionV4.EntryPropsIn>(
    branch(
        ({ context, parsedSchema }: SectionV4.EntryPropsIn): boolean => !(context && strictlyIsObject(context) && parsedSchema && strictlyIsObject(parsedSchema)),
        renderNothing
    ),
    withProps(
        ({ context, computations, parsedSchema, sectionComponents, level = 0, fieldNode, sectionNode, tokenParams }: RouteComponentProps & SectionV4.EntryPropsIn): SectionV4.EntryPropsAdditional & { visible: boolean } => {
            let { _type_ = '', _visible_ = true } = parsedSchema ?? {};
            const { _sections_ = [], _fields_ = [] } = parsedSchema ?? {};
            if (!Array.isArray(_sections_) || !Array.isArray(_fields_))
                throw new Error('Sections: _sections_/_fields_ must be an array.');
            if (isDataLink(_type_)) {
                _type_ = syncDataParser({
                    schema: _type_,
                    data: context,
                    functions: computations,
                    tokens: tokenParams
                } as DataParserInterfaces.v5.EntryParams);
                if (typeof _type_ !== 'string') {
                    console.error('[error] SectionEntry: _type_ must be a string.');
                    _type_ = '';
                }
            }
            if (isDataLink(_visible_)) {
                _visible_ = syncDataParser({
                    schema: _visible_,
                    data: context,
                    functions: computations,
                    tokens: tokenParams
                } as DataParserInterfaces.v5.EntryParams);
            }
            const Comp = _type_ && _type_ in sectionComponents && sectionComponents[_type_]
                ? sectionComponents[_type_]
                : sectionComponents['DefaultSection'];

            if (!Comp) throw new Error('Sections: DefaultSection must be defined.');

            let sections: JSX.Element[] = [];
            if (_sections_.length) {
                const Section = sectionNode();
                sections = _sections_.map((schema, i) => 
                    <Section
                        parsedSchema={schema}
                        level={level + 1}
                        key={i}
                    />
                );
            }

            let fields: JSX.Element[] = [];
            if (_fields_.length) {
                const Field = fieldNode();
                fields = _fields_.map((schema, i) => 
                    <Field
                        parsedSchema={schema}
                        level={level}
                        key={i}
                    />
                );
            }

            return {
                visible: !!_visible_,
                Comp,
                sections,
                fields,
            };
        }
    ),
    branch(({ visible }: { visible: boolean}) => !visible, renderNothing)
)(WrappedClientSectionComponent);
