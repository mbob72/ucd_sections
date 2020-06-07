/* eslint-disable @typescript-eslint/no-explicit-any */
export type ExtendedPropertyDescriptorMap = PropertyDescriptorMap | Record<symbol, PropertyDescriptor>
export type DataContext = Record<string & symbol, any> | null;
export type SchemaCallbackCollection = Record<string, ComputationsInterfaces.SchemaCallbackSimple | ComputationsInterfaces.SchemaCallbackForComputations>;
export type Primitives = string | number | boolean | symbol | null;

export namespace SchemaInterfaces {
    export type SchemaValue = Record<string, any> | Array<Record<string, any>> | string | Array<string>;
    export interface Template {
        _dataLink_: string,
        _template_: SchemaValue
    }

    export interface Section {
        _type_?: string,
        _visible_?: string | boolean,
        _sections_?: Array<Section> | Template,
        _fields_?: Template
    }

    export interface TopSection extends Section {
        _formId_?: string,
        _defaultData_?: Record<string, any>
    }

    export interface Field {
        _type_?: string,
        _visible_?: string | boolean,
        _value_?: string,
        _computations_?: Computations
    }

    export interface FieldValue {
        value: Record<string, any>
    }

    export interface Computations {
        _initial_?: string | Array<string>,
        _before_?: string | Array<string>,
        _unmount_?: string | Array<string>,
        _after_?: string | Array<string>
        _handlers_?: {
            _onClick_?: string | Array<string & FieldValue>,
            _onBlur_?: string | Array<string & FieldValue>,
            _onChange_?: string | Array<string & FieldValue>
        }
    }
}

export namespace SectionInterfaces {
    export namespace v4 {
        type TokenParams = Record<string, string | Array<string> | null | undefined>;
        type updateStateCallback = (data: DataContext) => void;
        export type Styles = Record<string, string>;
        export type ClientFieldComponent = React.ComponentClass<Field.ComponentProps>;
        export type ClientSectionComponent = React.ComponentClass<Section.ComponentProps>;
        export type FieldComponentsCollection = Record<string, ClientFieldComponent>;
        export type SectionComponentsCollection = Record<string, ClientSectionComponent>;

        export namespace Section {
            export interface ReactContextValue {
                updateState: updateStateCallback,
                computations: SchemaCallbackCollection,
                sectionComponents: SectionComponentsCollection,
                fieldComponents: FieldComponentsCollection,
                context: DataContext | null,
                styles: Record<string, string>
            }

            export interface TopState {
                data: Record<string, any> | null,
                schema: Record<string, any> | null,
                context: Record<string, any> | null,
                parsedSchema: ParsedSchema | null
            }

            export interface TopProps {
                data: Record<string, any>,
                schema: Record<string, any>,
                styles: Styles,
                fieldComponents: FieldComponentsCollection,
                sectionComponents: SectionComponentsCollection,
                computations: SchemaCallbackCollection
            }

            export interface NodeProps {
                parsedSchema: ParsedSchema | null,
                level?: number
            }

            export interface EntryPropsIn {
                styles: Styles,
                fieldComponents: FieldComponentsCollection,
                sectionComponents: SectionComponentsCollection,
                computations: SchemaCallbackCollection,
                context: DataContext | null,
                parsedSchema: ParsedSchema | null,
                level?: number,
                updateState: updateStateCallback
            }

            export interface EntryPropsAdditional {
                tokenParams: TokenParams,
                sections: Array<JSX.Element>,
                fields: Array<JSX.Element>,
                Comp: ClientSectionComponent
            }

            export interface ComponentProps {
                sections: Array<JSX.Element>,
                fields: Array<JSX.Element>,
                ScopedSection: (props: NodeProps) => JSX.Element,
                ScopedField: (props: Field.NodeProps) => JSX.Element,
                computations: SchemaCallbackCollection,
                context: DataContext | null,
                parsedSchema: ParsedSchema | null,
                level?: number,
                updateState: updateStateCallback,
                styles: Styles,
                tokenParams: TokenParams,
            }

            export interface ParsedSchema {
                _objectId_: number,
                _type_?: string,
                _sections_?: SchemaInterfaces.Section | SchemaInterfaces.Template,
                _fields_?: SchemaInterfaces.Field | SchemaInterfaces.Template,
                _visible_?: string | boolean
            }
        }

        export namespace Field {
            type Handlers = Record<string, (event: React.SyntheticEvent & { target: { value?: any } }) => void>;
            export interface NodeProps {
                parsedSchema: ParsedSchema | null,
                level?: number
            }
            
            export interface EntryPropsIn {
                styles: Styles,
                context: DataContext | null,
                parsedSchema: ParsedSchema | null,
                updateState: updateStateCallback,
                computations: SchemaCallbackCollection,
                fieldComponents: FieldComponentsCollection,
                sectionComponents: SectionComponentsCollection,
                level?: number
            }

            export interface EntryPropsAdditional {
                handlers: Handlers,
                errors: Array<string>,
                loading: boolean,
                Comp: ClientFieldComponent
            }

            export interface ComponentProps {
                styles: Record<string, string>
                loading: boolean,
                context: DataContext | null,
                handlers: Handlers,
                errors: Array<string>,
                parsedSchema: ParsedSchema | null,
                level?: number,
                computations: SchemaCallbackCollection
            }

            export interface ParsedSchema {
                _objectId_: number,
                _type_?: string,
                _visible_?: string | boolean,
                _value_?: string,
                _computations_?: SchemaInterfaces.Computations
            }
        }
    }
}

export namespace ComputationsInterfaces {
    export interface SyncComputation {
        (value: ComputationValue, environment: ComputationEnvironment): ComputationValue | never; // can throw BreakPromiseChainError, ValidationError and some other type of Error.
    }
    
    export interface AsyncComputation {
        (value: ComputationValue, environment: ComputationEnvironment): Promise<ComputationValue> | never; // can throw BreakPromiseChainError, ValidationError and some other type of Error.
    }
    
    export interface GeneratorComputation {
        (value: ComputationValue, environment: ComputationEnvironment): Iterator<ComputationValue | Promise<ComputationValue>, ComputationValue | Promise<ComputationValue>> | never;
    }
    
    export interface SchemaCallbackSimple {
        (...args: Array<any>): Primitives | never;
    }
    
    export interface SchemaCallbackForComputations {
        (...args: Array<any>) : SyncComputation | AsyncComputation | GeneratorComputation | never
    }
    
    export interface ComputationValue { // Value of the current field.
        dataLink: string,
        value: any | null
    }
    
    export interface ComputationEnvironment {
        currentSchemaObject: Record<string, any>,
        updateState: (context: DataContext) => void,
        schema: Record<string, Array<any> | Record<string, any>>,   // full schema object
        context: DataContext,                                               // deep copy of the context
        computations: SchemaCallbackCollection,
        location: Location,                                                 // window.location
        match: any // todo: needs to be clarified...
    }
}

export namespace DataParserInterfaces {
    export namespace v4 {}
    export namespace v5 {}
}

export namespace DataLinkParserInterfaces {
    export namespace v1 {}
    export namespace v2 {}
}