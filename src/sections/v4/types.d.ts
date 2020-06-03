type DataContext = Record<string, unknown>;

type SchemaValue = Record<string, unknown> | Record<string, unknown>[] | string | string[];

interface FieldValueInterface {
    dataLink: string,
    value: unknown
}

interface ComputationEnvironmentInterface {
    currentSchemaObject: Record<string, unknown>,
    updateState: (context: DataContext) => void,
    schema: Record<string, Array<unknown> | Record<string, unknown>>
}

interface SectionPropsInterface {
    schema: Record<string, unknown>,
    computations: Record<string, () => (value: FieldValueInterface, env: ComputationEnvironmentInterface) => FieldValueInterface | Promise<FieldValueInterface>>
}