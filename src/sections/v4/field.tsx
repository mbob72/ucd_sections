import React from 'react';
import {
    branch,
    compose,
    renderNothing,
    withPropsOnChange,
    withStateHandlers,
} from 'recompose';

import { isEmpty } from '../../utils';
import { isDataLink } from '../../data_link_parser/utils';
import { RouteComponentProps } from 'react-router';
import { syncDataParser } from '../../data_parser/v5';
import { SectionInterfaces, DataContext, SchemaCallbackList, TokenParams, DataParserInterfaces } from 'types/types';
import FieldV4 = SectionInterfaces.v4.Field;

const EVENTS = {
    _onBlur_: 'onBlur',
    _onChange_: 'onChange',
    _onClick_: 'onClick',
};

const getSetStateParams = (
    valueLink: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    schema: FieldV4.ParsedSchema,
    actions: SchemaCallbackList,
    after: Array<string>,
    context: DataContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    match: any, // todo: should be clarified...
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    location: any, // todo: should be clarified...
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    history: any, // todo: should be clarified...
    tokenParams: TokenParams
): SectionInterfaces.v4.UpdateStateCallbackParam => {
    const dataLink = valueLink && '@' + valueLink.replace(/@?\\/g, '');
    return {
        value: { dataLink, value },
        currentSchemaObject: schema,
        actions,
        after,
        context,
        match,
        location,
        history,
        tokenParams
    };
};

const WrappedClientFieldComponent = ({
    parsedSchema,
    level,
    context,
    handlers,
    errors,
    Comp,
    computations,
    loading,
    styles,
    tokenParams
}: FieldV4.EntryPropsIn & FieldV4.EntryPropsAdditional) => {
    return (
        <Comp
            styles={styles}
            loading={loading}
            context={context}
            handlers={handlers}
            errors={errors}
            parsedSchema={parsedSchema}
            level={level || 0}
            computations={computations}
            tokenParams={tokenParams}
        />
    );
};

export const FieldEntry: React.ComponentClass<FieldV4.EntryPropsIn> = compose<FieldV4.EntryPropsIn & FieldV4.EntryPropsAdditional, FieldV4.EntryPropsIn>(
    branch(
        ({ context, parsedSchema }: FieldV4.EntryPropsIn) => isEmpty(context) || isEmpty(parsedSchema),
        renderNothing
    ),
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
            context = {},
            parsedSchema,
            updateState,
            match,
            location,
            history,
            fieldComponents,
            computations,
            loading,
            tokenParams
        }: FieldV4.EntryPropsIn & RouteComponentProps & { loading: boolean, setLoadingState: (state: boolean) => void }): FieldV4.EntryPropsAdditional & { visible: boolean } => {
            const {
                _objectId_ = 0,
                _value_ = '',
                _visible_ = true,
                _computations_: {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    _initial_: initial = [], // todo: not implemented.
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    _before_: before = [], // todo: not implemented.
                    _handlers_ = {},
                    _after_: after = [],
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    _unmount_: unmount = [], // todo: not implemented.
                } = {},
            } = parsedSchema ?? {};
            if (_objectId_ && !Number.isInteger(_objectId_))
                throw new Error('[error] SectionField: _objectId_ must be a number.');
            let { _type_ = '' } = parsedSchema ?? {};
            if (!Array.isArray(after))
                throw new Error('[error] SectionField: _after_ must be an array.');
            const visible =
        typeof _visible_ === 'string'
            ? syncDataParser({
                schema: _visible_,
                data: context,
                functions: computations,
                tokens: tokenParams
            } as DataParserInterfaces.v5.EntryParams)
            : !!_visible_;
            if (isDataLink(_type_)) {
                _type_ = syncDataParser({
                    schema: _type_,
                    data: context,
                    functions: computations,
                    tokens: tokenParams
                } as DataParserInterfaces.v5.EntryParams);
                if (typeof _type_ !== 'string') {
                    console.error('[error] SectionField: _type_ must be a string.');
                    _type_ = '';
                }
            }
            const Comp = _type_ && _type_ in fieldComponents
                ? fieldComponents[_type_]
                : fieldComponents['DefaultField'];

            if (!Comp)
                throw new Error('[error] SectionField: DefaultField must be defined.');

            const handlers: FieldV4.Handlers = {};
            for (const eventType of Object.getOwnPropertyNames(_handlers_)) {
                if (!(eventType in EVENTS)) continue;
                let actions = _handlers_[eventType];
                actions = Array.isArray(actions) ? actions : [ actions ];
                handlers[EVENTS[eventType]] = (e) =>
                    updateState(
                        getSetStateParams(
                            _value_,
                            e.target.value,
                            parsedSchema as SectionInterfaces.v4.Field.ParsedSchema,
                            actions,
                            after,
                            context,
                            match,
                            location,
                            history,
                            tokenParams
                        )
                    );
            }

            const { errors } = context ? context[Symbol.for(String(_objectId_))] || {} : undefined;
            return {
                visible,
                handlers,
                errors,
                loading,
                // value,
                Comp,
            };
        }
    ),
    branch(({ visible }: { visible: boolean }) => !visible, renderNothing)
)(WrappedClientFieldComponent);
