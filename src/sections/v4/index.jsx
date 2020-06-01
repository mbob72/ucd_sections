import React from 'react'
import schemaParser from '../../data_parser/v4'
import { getHandler } from '../../computations/handler/v2'
import { strictlyIsObject } from '../../utils'
import Section from './components/section_entry'
import * as builtInSyncComputations from '../../computations'
import * as experimental from '../../computations/experimental'
import * as builtInAsyncComputations from '../../computations/async_computations'

/**
 * This context provides for consumers an "immutable" object with some general data.
 * This object is never changed, but it can contain another data in a deep call.
 * @type {React.Context<Object>}
 */
const SectionsContext = React.createContext({})

class TopSection extends React.Component {
    constructor (props) {
        super(props)
        this.state = {
            context: null,
            parsedSchema: null,
            data: null,
            schema: null
        }
    }

    static getDerivedStateFromProps (props, state) {
        const { data, schema } = props
        const { data: stateData, schema: stateSchema } = state
        if (data === stateData && schema === stateSchema) return null
        if (schema && strictlyIsObject(schema) && data && strictlyIsObject(data)) {
            const { context: newContext, schema: newSchema } = schemaParser({ dataLink: schema, data, renderFunctions: builtInSyncComputations })
            window.debug = {
                contextMap: newContext,
                parsedSchema: newSchema
            }

            return {
                context: newContext,
                parsedSchema: newSchema,
                data,
                schema
            }
        } else return null
    }

    updateContext (context) {
        this.setState({ context })
    }

    render () {
        const { computations, sectionComponents, fieldComponents, data, schema, styles } = this.props
        const fullComputations = { ...computations, ...builtInSyncComputations, ...builtInAsyncComputations, ...experimental }
        const { context, parsedSchema } = this.state
        if (!(data && strictlyIsObject(data) && schema && strictlyIsObject(schema))) return null
        const setState = getHandler({
            schema: parsedSchema,
            computations: fullComputations,
            updateState: this.updateContext.bind(this)
        })
        const sectionsContextValue = {
            computations: fullComputations,
            sectionComponents,
            fieldComponents,
            setState,
            context,
            styles
        }
        return <SectionsContext.Provider value={sectionsContextValue}>
            <Section
                parsedSchema={parsedSchema}
                level={0} />
        </SectionsContext.Provider>
    }
}
export {
    SectionsContext
}
export default TopSection
