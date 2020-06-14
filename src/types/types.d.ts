import { RouteComponentProps } from 'react-router';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type ExtendedPropertyDescriptorMap = PropertyDescriptorMap | Record<symbol, PropertyDescriptor>
export type DataContext = Record<string & symbol, any> | null;
export type SchemaCallbackCollection = Record<string, ComputationsInterfaces.SchemaCallbackSimple | ComputationsInterfaces.SchemaCallbackForComputations>;
export type Primitives = string | number | boolean | symbol | null;
type TokenParams = qs.ParsedQs;

export namespace SchemaInterfaces {
    export type SchemaValue = Record<string, any> | Array<Record<string, any>> | string | Array<string>;
    export interface GeneralSchemaObjectInterface extends Section, Field, Template {}
    export interface Template {
        _dataLink_?: string,
        _template_: SchemaValue
    }

    export interface Section {
        _type_?: string,
        _dataLink_?: string,
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
        _dataLink?: string,
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
        type updateStateCallback = (data: DataContext) => void;
        export type Styles = Record<string, string>;
        export type ClientFieldComponent = React.ComponentClass<Field.ComponentProps>;
        export type ClientSectionComponent = React.ComponentClass<Section.ComponentProps>;
        export type FieldComponentsCollection = Record<string, ClientFieldComponent>;
        export type SectionComponentsCollection = Record<string, ClientSectionComponent>;

        export namespace Section {
            export interface SectionsEnvironment extends RouteComponentProps {
                updateState: updateStateCallback,
                computations: SchemaCallbackCollection,
                sectionComponents: SectionComponentsCollection,
                fieldComponents: FieldComponentsCollection,
                styles: Record<string, string>
            }

            export interface TopState {
                data: Record<string, any> | null,
                schema: Record<string, any> | null,
                context: Record<string, any> | null,
                parsedSchema: ParsedSchema | null,
                tokenParams: TokenParams
            }

            export interface TopProps extends RouteComponentProps {
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

            export interface EntryPropsIn extends RouteComponentProps {
                styles: Styles,
                fieldComponents: FieldComponentsCollection,
                sectionComponents: SectionComponentsCollection,
                computations: SchemaCallbackCollection,
                context: DataContext | null,
                parsedSchema: ParsedSchema | null,
                level?: number,
                updateState: updateStateCallback,
                fieldNode: () => React.FunctionComponent<Field.NodeProps>,
                sectionNode: () => React.FunctionComponent<NodeProps>,
                tokenParams: TokenParams
            }

            export interface EntryPropsAdditional {
                sections: Array<JSX.Element>,
                fields: Array<JSX.Element>,
                Comp: ClientSectionComponent
            }


            export interface ComponentProps {
                sections: Array<JSX.Element>,
                fields: Array<JSX.Element>,
                SectionNode: React.FunctionComponent<NodeProps>,
                FieldNode: React.FunctionComponent<Field.NodeProps>,
                computations: SchemaCallbackCollection,
                context: DataContext | null,
                parsedSchema: ParsedSchema | null,
                level?: number,
                updateState: updateStateCallback,
                styles: Styles,
                tokenParams: TokenParams
            }

            export interface ParsedSchema {
                readonly _objectId_?: number,
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
            
            export interface EntryPropsIn extends RouteComponentProps {
                styles: Styles,
                context: DataContext | null,
                parsedSchema: ParsedSchema | null,
                updateState: updateStateCallback,
                computations: SchemaCallbackCollection,
                fieldComponents: FieldComponentsCollection,
                sectionComponents: SectionComponentsCollection,
                tokenParams: TokenParams,
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
                tokenParams: TokenParams,
                level?: number,
                computations: SchemaCallbackCollection
            }

            export interface ParsedSchema {
                readonly _objectId_?: number,
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
        schema: Record<string, Array<any> | Record<string, any>>,           // full schema object
        context: DataContext,                                               // deep copy of the context (data)
        computations: SchemaCallbackCollection,
        location: Location,                                                 // window.location
        match: any // todo: needs to be clarified...
    }
}

export namespace DataParserInterfaces {
    export namespace v4 {
        interface GeneralParamsInterface {
            data: DataContext,
            rootData?: DataContext,
            renderFunctions: SchemaCallbackCollection,
            tokens?: TokenParams,
            defaultData?: any
        }
        export namespace Preprocessor {
            interface GeneralPreprocessorParamsInterface extends GeneralParamsInterface {
                dataPath?: string,
                schemaPath?: Array<string>,
                meta?: Record<string, any>
                tokens?: TokenParams
            }

            export interface ParserParamsEntry extends GeneralPreprocessorParamsInterface {
                dataLink: Record<string, any>
            }

            interface Inner extends GeneralPreprocessorParamsInterface {
                context: Record<string & symbol, any>,
            }

            export interface ParserParamsAny extends Inner {
                dataLink: SchemaInterfaces.GeneralSchemaObjectInterface | Array<SchemaInterfaces.GeneralSchemaObjectInterface | string> | string
            }
    
            export interface ParserParamsObject extends Inner {
                dataLink: SchemaInterfaces.GeneralSchemaObjectInterface
            }
    
            export interface ParserParamsArray extends Inner {
                dataLink: Array<SchemaInterfaces.GeneralSchemaObjectInterface | string>
            }
    
            export interface ParserParamsString extends Inner {
                dataLink: string
            }

            export interface ParserParamsComputations extends Inner {
                dataLink: SchemaInterfaces.Computations
            }
        }

        export interface ParserParamsAny extends GeneralParamsInterface {
            dataLink: SchemaInterfaces.GeneralSchemaObjectInterface | Array<SchemaInterfaces.GeneralSchemaObjectInterface | string> | string | Record<string, any>
        }

        export interface ParserParamsObject extends GeneralParamsInterface {
            dataLink: SchemaInterfaces.GeneralSchemaObjectInterface
        }

        export interface ParserParamsArray extends GeneralParamsInterface {
            dataLink: Array<SchemaInterfaces.GeneralSchemaObjectInterface | string>
        }

        export interface ParserParamsString extends GeneralParamsInterface {
            dataLink: string
        }
    }
    export namespace v5 {
        interface GeneralParamsInterface {
            data: DataContext,
            rootData: DataContext,
            functions: SchemaCallbackCollection,
            tokens: Record<string, string | number>,
            defaultData: any,
            mode: number
        }

        export interface EntryParams extends GeneralParamsInterface {
            schema: SchemaInterfaces.GeneralSchemaObjectInterface | Array<SchemaInterfaces.GeneralSchemaObjectInterface | string> | string
        }

        export interface ParserParamsAny extends GeneralParamsInterface {
            dataLink: SchemaInterfaces.GeneralSchemaObjectInterface | Array<SchemaInterfaces.GeneralSchemaObjectInterface | string> | string
        }

        export interface ParserParamsObject extends GeneralParamsInterface {
            dataLink: SchemaInterfaces.GeneralSchemaObjectInterface
        }

        export interface ParserParamsArray extends GeneralParamsInterface {
            dataLink: Array<SchemaInterfaces.GeneralSchemaObjectInterface | string>
        }

        export interface ParserParamsString extends GeneralParamsInterface {
            dataLink: string
        }
    }
}

export namespace DataLinkParserInterfaces {
    export namespace v1 {}
    export namespace v2 {}
}