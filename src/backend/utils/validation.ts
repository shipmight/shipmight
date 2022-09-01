import Ajv, { SchemaObject } from "ajv";
import AjvValidationError from "ajv/dist/runtime/validation_error";

export const ValidationError = AjvValidationError;

export const valuesForSpecificFields = (
  values: { [key: string]: unknown },
  fields: string[]
): { [key: string]: unknown } => {
  const obj: ReturnType<typeof valuesForSpecificFields> = {};
  for (const key of fields) {
    obj[key] = values[key];
  }
  return obj;
};

// Note! This function exists in multiple files.
// Keep all versions in sync!
// Ref for searching: ref-schemaForSpecificValuesFields
export const schemaForSpecificValuesFields = (
  schema: SchemaObject,
  fields: string[]
): SchemaObject => {
  if (typeof schema !== "object" || schema.type !== "object") {
    throw new Error("expected a JSON schema describing an object");
  }
  if (!schema.properties.values) {
    throw new Error("expected a schema containing values object");
  }
  const altered: SchemaObject = {
    ...schema,
    properties: {
      values: {
        ...schema.properties.values,
      },
    },
    required: ["values"],
  };
  if (altered.properties.values.properties) {
    altered.properties.values.properties = Object.keys(
      altered.properties.values.properties
    ).reduce<{
      [key: string]: unknown;
    }>((obj, key) => {
      if (fields.includes(key)) {
        obj[key] = altered.properties.values.properties[key];
      }
      return obj;
    }, {});
  }
  if (altered.properties.values.required) {
    altered.properties.values.required =
      altered.properties.values.required.filter((key: string) =>
        fields.includes(key)
      );
  }
  return altered;
};

export const jsonSchemaValidate = (
  schema: SchemaObject,
  values: unknown
): void => {
  const validator = new Ajv();
  validator.validate(schema, { values });
  if (validator.errors) {
    throw new ValidationError(validator.errors);
  }
};
