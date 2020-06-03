import React from "react";
import { branch, compose, renderNothing, withProps } from "recompose";
import qs from "query-string";

import { SectionsContext } from "../index";

import { strictlyIsObject } from "../../../utils";
import { isDataLink } from "../../../data_link_parser/utils";
import dataLinkParser from "../../../data_link_parser/v1";
import getDataLink from "../../../data_parser/utils/data_link_cache";
import SectionField from "./section_field";
import { withRouter } from "react-router";

const ScopedSection = ({ parsedSchema, level = 0 }) => 
    <Section
        parsedSchema={parsedSchema}
        level={level}
    />


const ScopedField = ({ parsedSchema, level = 0 }) => 
    <SectionField
        parsedSchema={parsedSchema}
        level={level}
    />


/**
 * Sections entry point
 * @param {object} params
 * @param {object} params.schema - section schema (metadata)
 * @param {object} params.data - section data
 * @param {object} params.context - section context
 * @param {number} level - section level, counting from first, that parses
 * @returns {React Component}
 */
const SectionEntry = compose(
  withRouter,
  branch(
    ({ context = null, parsedSchema = null }) =>
      !(
        context &&
        strictlyIsObject(context) &&
        parsedSchema &&
        strictlyIsObject(parsedSchema)
      ),
    renderNothing
  ),
  withProps(
    ({
      history,
      context,
      computations,
      parsedSchema,
      sectionComponents,
      level,
    }) => {
      const tokenParams = { ...qs.parse(history.location.search) };
      let { _type_ = "", _visible_ = true } = parsedSchema;
      const { _sections_ = [], _fields_ = [] } = parsedSchema;
      if (!Array.isArray(_sections_) || !Array.isArray(_fields_))
        throw new Error("Sections: _sections_/_fields_ must be an array.");
      if (isDataLink(_type_)) {
        _type_ = dataLinkParser({
          dataLink: getDataLink(_type_),
          data: context,
          renderFunctions: computations,
        });
        if (typeof _type_ !== "string") {
          console.error("[error] SectionEntry: _type_ must be a string.");
          _type_ = "";
        }
      }
      if (isDataLink(_visible_)) {
        _visible_ = dataLinkParser({
          dataLink: getDataLink(_visible_),
          data: context,
          renderFunctions: computations,
        });
      }
      const Comp =
        _type_ && _type_ in sectionComponents
          ? sectionComponents[_type_]
          : sectionComponents["DefaultSection"];

      if (!Comp) throw new Error("Sections: DefaultSection must be defined.");

      let sections = [];
      if (_sections_.length) {
        sections = _sections_.map((schema, i) => 
                <ScopedSection
                    parsedSchema={schema}
                    level={level + 1}
                    key={i}
                />
            );
      }

      let fields = [];
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
  branch(({ visible }) => !visible, renderNothing)
)(
  ({
    parsedSchema,
    level,
    tokenParams,
    context,
    Comp,
    sections,
    fields,
    setState,
    computations,
    styles,
  }) => {
    return (
      <Comp
        styles={styles}
        context={context}
        parsedSchema={parsedSchema}
        sections={sections}
        fields={fields}
        tokenParams={tokenParams}
        level={level}
        setState={setState}
        computations={computations}
        ScopedSection={ScopedSection}
        ScopedField={ScopedField}
      />
    );
  }
);

const Section = ({ parsedSchema }) => {
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
          <SectionEntry
            styles={styles}
            context={context}
            parsedSchema={parsedSchema}
            setState={setState}
            computations={computations}
            sectionComponents={sectionComponents}
            fieldComponents={fieldComponents}
          />;
        );
      }}
    </SectionsContext.Consumer>;
  );
};

export default Section;
