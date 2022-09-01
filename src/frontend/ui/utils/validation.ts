import Ajv, { ErrorObject, SchemaObject } from "ajv";
import { FormikErrors } from "formik";
import apiSchema from "../../../backend/api/apiSchema.json";
import {
  ApiPostPath,
  ApiPostRequestPayload,
} from "../../../backend/api/requests";

const ajv = new Ajv({ strict: false, allErrors: true });
ajv.addSchema(apiSchema, "apiSchema.json");

const ajvPathEncode = (text: string) => text.replace(/\//g, "~1");
const toAjvPath = (path: string): string => {
  const encoded = ajvPathEncode(path);
  return `apiSchema.json#/paths/${encoded}/post/requestBody/content/application~1json/schema`;
};

const formatErrorMessage = (error: ErrorObject, value: unknown): string => {
  if (error.keyword === "minLength") {
    if (error.params.limit === 1) {
      return `cannot be empty`;
    } else {
      return `must be at least ${error.params.limit} characters`;
    }
  }

  if (error.keyword === "maxLength") {
    return `must be ${error.params.limit} characters or less`;
  }

  if (error.keyword === "pattern") {
    // GenericNameValue
    if (error.params.pattern === "^(?! )[A-Za-z0-9 ]*[A-Za-z0-9]$") {
      if (typeof value === "string" && value.match(/^ /)) {
        return "must not begin with a space";
      }
      if (typeof value === "string" && value.match(/ $/)) {
        return "must not end with a space";
      }
      if (typeof value === "string" && !value.match(/^[A-Za-z0-9 ]+$/)) {
        return "must consist of alphabets, numbers and spaces";
      }
    }
    // ImageNameValue
    if (error.params.pattern === "^(?=[a-z0-9])[a-z0-9\\-/]*[a-z0-9]$") {
      if (typeof value === "string" && !value.match(/^[a-z0-9]/)) {
        return "must begin with a lowercase character (a-z) or a number (0-9)";
      }
      if (typeof value === "string" && !value.match(/[a-z0-9]$/)) {
        return "must end with a lowercase character (a-z) or a number (0-9)";
      }
      return "must consist of lowercase alphabets, numbers and dashes";
    }
    // ImageTagValue
    if (error.params.pattern === "^(?=[a-z0-9])[a-z0-9\\-/.]*[a-z0-9]$") {
      if (typeof value === "string" && !value.match(/^[a-z0-9]/)) {
        return "must begin with a lowercase character (a-z) or a number (0-9)";
      }
      if (typeof value === "string" && !value.match(/[a-z0-9]$/)) {
        return "must end with a lowercase character (a-z) or a number (0-9)";
      }
      return "must consist of lowercase alphabets, numbers, periods and dashes";
    }
  }

  if (error.keyword === "minimum") {
    return `must be ${error.params.limit} or greater`;
  }

  if (error.keyword === "maximum") {
    return `must be ${error.params.limit} or less`;
  }

  return "is invalid";
};

export const validateOpenApiPath = <P extends ApiPostPath>(
  path: P
): ((
  values: ApiPostRequestPayload<P>
) => FormikErrors<ApiPostRequestPayload<P>>) => {
  const ajvPath = toAjvPath(path);
  return (values) => {
    const errors: FormikErrors<ApiPostRequestPayload<P>> = {};
    ajv.validate(ajvPath, values);
    if (ajv.errors) {
      for (const error of ajv.errors) {
        const propertyName = error.instancePath.replace(/^\//, "");
        const message = formatErrorMessage(error, values[propertyName]);
        errors[propertyName] = message;
      }
    }
    return errors;
  };
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

// This validator functions specifically for schemas that hold the values object
// in schema.properties.values, like all values.schema.json files in app charts
export const jsonSchemaValuesValidator = (
  schema: SchemaObject
): ((values: unknown) => FormikErrors<unknown>) => {
  if (!schema.properties.values) {
    throw new Error("expected a schema containing values object");
  }
  const validate = ajv.compile(schema);
  return function jsonSchemaValuesValidatorFn(values) {
    validate({ values });
    const requiredButMissing: string[] = [];
    const errors: FormikErrors<unknown> = {};
    if (validate.errors) {
      for (const error of validate.errors) {
        if (error.keyword === "required") {
          requiredButMissing.push(error.params.missingProperty);
        } else {
          // instancePath begins with a slash, therefore skip first segment
          // and it continues with "values", therefore skip second segment
          const [, , propertyName, childName, childPropertyName] =
            error.instancePath.split("/");
          if (childName && childName.match(/^[0-9]+$/) && childPropertyName) {
            const childIndex = parseInt(childName);
            errors[propertyName] = errors[propertyName] || [];
            errors[propertyName][childIndex] =
              errors[propertyName][childIndex] || {};
            errors[propertyName][childIndex][childPropertyName] =
              formatErrorMessage(error, values[propertyName][childIndex]);
          } else if (
            !errors[propertyName] ||
            // Override previously set "is invalid" error because any following
            // error must be more specific (e.g. in anyOf cases)
            errors[propertyName] === "is invalid"
          ) {
            errors[propertyName] = formatErrorMessage(
              error,
              values[propertyName]
            );
          }
        }
      }
    }
    for (const property of requiredButMissing) {
      // Only add required-error if field didn't already have a more precise error
      if (!errors[property]) {
        errors[property] = "is required";
      }
    }
    return errors;
  };
};
