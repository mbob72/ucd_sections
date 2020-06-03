import React from 'react';
import {
    branch,
    compose,
    renderNothing,
    withPropsOnChange,
    withStateHandlers,
} from 'recompose';

import { SectionsContext } from '../index';
import { isEmpty } from '../../../utils';
import { isDataLink } from '../../../data_link_parser/utils';
import dataLinkParser from '../../../data_link_parser/v1';
import getDataLink from '../../../data_parser/utils/data_link_cache';
import { withRouter } from 'react-router';
import { simpleDataParser } from '../../../data_parser/v4/simple_data_parser';

const EVENTS = {
    _onBlur_: 'onBlur',
    _onChange_: 'onChange',
    _onClick_: 'onClick',
};

const getSetStateParams = (
    valueLink,
    value,
    schema,
    actions,
    after,
    context,
    match,
    location
) => {
    const dataLink = valueLink && '@' + valueLink.replace(/@?\\/g, '');
    return {
        value: { dataLink, value },
        currentSchemaObject: schema,
        actions,
        after,
        context,
        match,
        location,
    };
};

const SectionField = compose(
    branch(
        ({ context, parsedSchema }) => isEmpty(context) || isEmpty(parsedSchema),
        renderNothing
    ),
    withRouter,
    withStateHandlers(
        {
            loading: false,
        },
        {
            setLoadingState: () => (state) => ({ loading: !!state }),
        }
    ),
    withPropsOnChange(
        [ 'context', 'parsedSchema' ],
        ({
            setLoadingState,
            context,
            parsedSchema,
            setState,
            match,
            location,
            fieldComponents,
            computations,
        }) => {
            const {
                _objectId_,
                _value_ = '',
                _visible_ = true,
                _computations_: {
                    // eslint-disable-next-line no-unused-vars
                    _initial_: initial = [], // todo: not implemented.
                    // eslint-disable-next-line no-unused-vars
                    _before_: before = [], // todo: not implemented.
                    _handlers_ = {},
                    _after_: after = [],
                    // eslint-disable-next-line no-unused-vars
                    _unmount_: unmount = [], // todo: not implemented.
                } = {},
            } = parsedSchema;
            if (!Number.isInteger(_objectId_))
                throw new Error('[error] SectionField: _objectId_ must be a number.');
            let { _type_ = '' } = parsedSchema;
            if (!Array.isArray(after))
                throw new Error('[error] SectionField: _after_ must be an array.');
            const visible =
        typeof _visible_ === 'string'
            ? simpleDataParser({
                dataLink: _visible_,
                data: context,
                renderFunctions: computations,
            })
            : !!_visible_;
            if (isDataLink(_type_)) {
                _type_ = dataLinkParser({
                    dataLink: getDataLink(_type_),
                    data: context,
                    renderFunctions: computations,
                });
                if (typeof _type_ !== 'string') {
                    console.error('[error] SectionField: _type_ must be a string.');
                    _type_ = '';
                }
            }
            const Comp =
        _type_ && _type_ in fieldComponents
            ? fieldComponents[_type_]
            : fieldComponents['DefaultField'];

            if (!Comp)
                throw new Error('[error] SectionField: DefaultField must be defined.');

            const handlers = {};
            for (const eventType of Object.getOwnPropertyNames(_handlers_)) {
                if (!(eventType in EVENTS)) continue;
                let actions = _handlers_[eventType];
                actions = Array.isArray(actions) ? actions : [ actions ];
                handlers[EVENTS[eventType]] = (e) =>
                    setState(
                        getSetStateParams(
                            _value_,
                            e.target.value,
                            parsedSchema,
                            actions,
                            after,
                            context,
                            match,
                            location
                        )
                    );
            }

            const { errors } = context[Symbol.for(_objectId_)] || {};
            return {
                visible,
                handlers,
                errors,
                // value,
                Comp,
            };
        }
    ),
    branch(({ visible }) => !visible, renderNothing)
)(
    ({
        parsedSchema,
        level,
        context,
        handlers,
        errors,
        Comp,
        computations,
        loading,
        styles,
    }) => {
        return (
            <Comp
                styles={styles}
                loading={loading}
                context={context}
                handlers={handlers}
                errors={errors}
                parsedSchema={parsedSchema}
                level={level}
                computations={computations}
            />
        );
    }
);

const FieldComponent = ({ parsedSchema }) => {
    return (
        <SectionsContext.Consumer>
            {({
                computations,
                sectionComponents,
                fieldComponents,
                context,
                setState,
                styles,
            }) => {
                return (
                    <SectionField
                        styles={styles}
                        context={context}
                        parsedSchema={parsedSchema}
                        setState={setState}
                        computations={computations}
                        sectionComponents={sectionComponents}
                        fieldComponents={fieldComponents}
                    />
                );
            }}
        </SectionsContext.Consumer>
    );
};

export default FieldComponent;
