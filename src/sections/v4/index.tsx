import React from 'react';
import schemaParser from '../../data_parser/v4';
import { getHandler } from '../../computations/handler/v2';
import { strictlyIsObject } from '../../utils';
import Section from './components/section_entry';
import * as builtInSyncComputations from '../../computations';
import * as experimental from '../../computations/experimental';
import * as builtInAsyncComputations from '../../computations/async_computations';
import { SectionInterfaces, DataContext } from 'types/types';
import SectionV4 = SectionInterfaces.v4.Section
/**
 * This context provides for consumers an "immutable" object with some general data.
 * This object is never changed, but it can contain another data in a deep call.
 */
const SectionsContext = React.createContext<SectionV4.ReactContextValue>({
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    updateState: () => {},
    context: {},
    fieldComponents: {},
    sectionComponents: {},
    styles: {},
    computations: {}
});

class TopSection extends React.Component<SectionV4.TopProps, SectionV4.TopState> {
    constructor(props: SectionV4.TopProps) {
        super(props);
        this.state = {
            context: null,
            parsedSchema: null,
            data: null,
            schema: null,
        };
    }

    static getDerivedStateFromProps(props: SectionV4.TopProps, state: SectionV4.TopState): SectionV4.TopState | null {
        const { data, schema } = props;
        const { data: stateData, schema: stateSchema } = state;
        if (data === stateData && schema === stateSchema) return null;
        if (schema && strictlyIsObject(schema) && data && strictlyIsObject(data)) {
            const { context: newContext, schema: newSchema } = schemaParser({
                dataLink: schema,
                data,
                renderFunctions: builtInSyncComputations,
            });

            return {
                context: newContext,
                parsedSchema: newSchema,
                data,
                schema,
            };
        } else return null;
    }

    updateContext(context: DataContext): void {
        this.setState({ context });
    }

    render(): JSX.Element | null {
        const {
            computations,
            sectionComponents,
            fieldComponents,
            data,
            schema,
            styles,
        } = this.props;
        const fullComputations = {
            ...computations,
            ...builtInSyncComputations,
            ...builtInAsyncComputations,
            ...experimental,
        };
        const { context, parsedSchema } = this.state;
        if (!(data && strictlyIsObject(data) && schema && strictlyIsObject(schema)))
            return null;
        const updateState = getHandler({
            schema: parsedSchema,
            computations: fullComputations,
            updateState: this.updateContext.bind(this),
        });
        const sectionsContextValue: SectionV4.ReactContextValue = {
            computations: fullComputations,
            sectionComponents,
            fieldComponents,
            updateState,
            context,
            styles,
        };
        return (
            <SectionsContext.Provider value={sectionsContextValue}>
                <Section parsedSchema={parsedSchema} level={0} />
            </SectionsContext.Provider>
        );
    }
}
export { SectionsContext };
export default TopSection;
