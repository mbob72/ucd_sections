import React, { FunctionComponent } from 'react';
import schemaParser from '../../data_parser/v4';
import { getHandler } from '../../computations/handler/v2';
import { strictlyIsObject } from '../../utils';
import { SectionEntry } from './section';
import { FieldEntry } from './field';
import * as builtInSyncComputations from '../../computations/functions';
// import * as experimental from '../../computations/experimental';
import * as builtInAsyncComputations from '../../computations/async_computations';
import { SectionInterfaces, DataContext } from 'types/types';
import SectionV4 = SectionInterfaces.v4.Section;
import FieldV4 = SectionInterfaces.v4.Field;
import qs from 'qs';

class TopSection extends React.Component<SectionV4.TopProps, SectionV4.TopState> {

    sectionEnvironment: SectionV4.SectionsEnvironment;

    constructor(props: SectionV4.TopProps) {
        super(props);
        const { history, match, location, computations, fieldComponents, sectionComponents, styles } = props;
        const fullComputations = {
            ...computations,
            ...builtInSyncComputations,
            ...builtInAsyncComputations,
            // ...experimental,
        };
        const tokenParams = { ...qs.parse(history.location.search) };
        this.sectionEnvironment = {
            computations: fullComputations,
            fieldComponents,
            sectionComponents,
            styles,
            history,
            location,
            match,
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            updateState: (): void => {}
        };
        this.state = {
            context: null,
            parsedSchema: null,
            data: null,
            schema: null,
            tokenParams
        };
        this.getField = this.getField.bind(this);
        this.getSection = this.getSection.bind(this);
        this.updateContext = this.updateContext.bind(this);
    }

    static getDerivedStateFromProps(props: SectionV4.TopProps, state: SectionV4.TopState): SectionV4.TopState | null {
        const { data, schema, history } = props;
        const { data: stateData, schema: stateSchema } = state;
        if (data === stateData && schema === stateSchema) return null;
        const tokenParams = { ...qs.parse(history.location.search) };
        if (schema && strictlyIsObject(schema) && data && strictlyIsObject(data)) {
            const { context: newContext, schema: newSchema } = schemaParser({
                dataLink: schema,
                data,
                renderFunctions: builtInSyncComputations,
                tokens: tokenParams
            });

            return {
                context: newContext,
                parsedSchema: newSchema,
                data,
                schema,
                tokenParams
            };
        } else return null;
    }

    getSection(): FunctionComponent<SectionV4.NodeProps> {
        return (params: SectionV4.NodeProps): JSX.Element => {
            const {
                computations,
                sectionComponents,
                fieldComponents,
                updateState,
                styles,
                history,
                location,
                match
            } = this.sectionEnvironment;
            const {
                level = 0,
                parsedSchema
            } = params;
            const {
                context,
                tokenParams
            } = this.state;

            return <SectionEntry
                styles={styles}
                tokenParams={tokenParams || {}}
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
                fieldNode={this.getField}
                sectionNode={this.getSection}
            />;
        };
    }

    getField():  FunctionComponent<SectionV4.NodeProps> {
        return (params: FieldV4.NodeProps): JSX.Element => {
            const {
                computations,
                sectionComponents,
                fieldComponents,
                updateState,
                styles,
                history,
                location,
                match
            } = this.sectionEnvironment;
            const {
                parsedSchema
            } = params;
            const {
                context,
                tokenParams
            } = this.state;

            return (
                <FieldEntry
                    styles={styles}
                    tokenParams={tokenParams || {}}
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
        };
    }

    updateContext(context: DataContext): void {
        this.setState({ context });
    }

    render(): JSX.Element | null {
        const {
            data,
            schema,
        } = this.props;
        const { parsedSchema } = this.state;
        if (!(data && strictlyIsObject(data) && schema && strictlyIsObject(schema)))
            return null;
        this.sectionEnvironment.updateState = getHandler({
            schema: parsedSchema || {}, // warning: is it right to use OR statement here?
            computations: this.sectionEnvironment.computations,
            updateState: this.updateContext,
        });
        const Section = this.getSection();
        return <Section parsedSchema={parsedSchema} level={0} />;
    }
}

export default TopSection;
