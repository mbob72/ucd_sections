import React from 'react';
import { branch, compose, renderNothing, withProps } from 'recompose';
import qs from 'query-string';

import { SectionsContext } from '../index';

import { strictlyIsObject } from '../../../utils';
import { isDataLink } from '../../../data_link_parser/utils';
import dataLinkParser from '../../../data_link_parser/v1';
import getDataLink from '../../../data_parser/utils/data_link_cache';
import SectionField from './section_field';
import { RouteComponentProps } from 'react-router';

import { SectionInterfaces } from '../../../types/types';
import SectionV4 = SectionInterfaces.v4.Section;
import FieldV4 = SectionInterfaces.v4.Field;

const ScopedSection = ({ parsedSchema, level = 0 }: SectionV4.NodeProps): JSX.Element => 
    <Section
        parsedSchema={parsedSchema}
        level={level}
    />;


const ScopedField = ({ parsedSchema, level = 0 }: FieldV4.NodeProps): JSX.Element => 
    <SectionField
        parsedSchema={parsedSchema}
        level={level}
    />;

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
    styles
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
            ScopedSection={ScopedSection}
            ScopedField={ScopedField}
        />
    );
};

/**
 * Sections entry point
 */
const SectionEntry: React.ComponentClass<SectionV4.EntryPropsIn> = compose<SectionV4.EntryPropsIn & SectionV4.EntryPropsAdditional, SectionV4.EntryPropsIn>(
    branch(
        ({ context, parsedSchema }: SectionV4.EntryPropsIn): boolean => !(context && strictlyIsObject(context) && parsedSchema && strictlyIsObject(parsedSchema)),
        renderNothing
    ),
    withProps(
        ({ history, context, computations, parsedSchema, sectionComponents, level = 0 }: RouteComponentProps & SectionV4.EntryPropsIn): SectionV4.EntryPropsAdditional & { visible: boolean } => {
            const tokenParams = { ...qs.parse(history.location.search) };
            let { _type_ = '', _visible_ = true } = parsedSchema ?? {};
            const { _sections_ = [], _fields_ = [] } = parsedSchema ?? {};
            if (!Array.isArray(_sections_) || !Array.isArray(_fields_))
                throw new Error('Sections: _sections_/_fields_ must be an array.');
            if (isDataLink(_type_)) {
                _type_ = dataLinkParser({
                    dataLink: getDataLink(_type_),
                    data: context,
                    renderFunctions: computations,
                });
                if (typeof _type_ !== 'string') {
                    console.error('[error] SectionEntry: _type_ must be a string.');
                    _type_ = '';
                }
            }
            if (isDataLink(_visible_)) {
                _visible_ = dataLinkParser({
                    dataLink: getDataLink(_visible_),
                    data: context,
                    renderFunctions: computations,
                });
            }
            const Comp = _type_ && _type_ in sectionComponents && sectionComponents[_type_]
                ? sectionComponents[_type_]
                : sectionComponents['DefaultSection'];

            if (!Comp) throw new Error('Sections: DefaultSection must be defined.');

            let sections: JSX.Element[] = [];
            if (_sections_.length) {
                sections = _sections_.map((schema, i) => 
                    <ScopedSection
                        parsedSchema={schema}
                        level={level + 1}
                        key={i}
                    />
                );
            }

            let fields: JSX.Element[] = [];
            if (_fields_.length) {
                fields = _fields_.map((schema, i) => 
                    <ScopedField
                        parsedSchema={schema}
                        level={level}
                        key={i}
                    />
                );
            }

            return {
                tokenParams,
                visible: !!_visible_,
                Comp,
                sections,
                fields,
            };
        }
    ),
    branch(({ visible }: { visible: boolean}) => !visible, renderNothing)
)(WrappedClientSectionComponent);

const Section = ({ parsedSchema, level }: SectionV4.NodeProps): JSX.Element => {
    return (
        <SectionsContext.Consumer>
            {({
                computations,
                sectionComponents,
                fieldComponents,
                context,
                updateState,
                styles,
                history,
                location, 
                match
            }: SectionV4.ReactContextValue): JSX.Element => {
                return (
                    <SectionEntry
                        styles={styles}
                        level={level}
                        context={context}
                        parsedSchema={parsedSchema}
                        updateState={updateState}
                        computations={computations}
                        sectionComponents={sectionComponents}
                        fieldComponents={fieldComponents}
                        history={history}
                        location={location}
                        match={match}
                    />
                );
            }}
        </SectionsContext.Consumer>
    );
};

export default Section;
