import { schemaForSpecificValuesFields } from "./validation";

describe("schemaForSpecificValuesFields", () => {
  it("throws if schema does not contain a values object", () => {
    expect(() =>
      schemaForSpecificValuesFields(
        {
          $schema: "http://json-schema.org/draft-07/schema",
          type: "object",
          properties: {
            name: { type: "string" },
            foobar: { type: "string" },
            extra: { type: "string" },
          },
          required: ["name", "foobar"],
        },
        []
      )
    ).toThrow(/expected a schema containing values object/);
  });

  it("removes any other required top-level properties except values", () => {
    const schema = {
      $schema: "http://json-schema.org/draft-07/schema",
      type: "object",
      properties: {
        values: {
          type: "object",
          properties: {},
          required: [],
        },
        foobar: {
          type: "string",
        },
      },
      required: ["values", "foobar"],
    };

    expect(schemaForSpecificValuesFields(schema, [])).toEqual({
      $schema: "http://json-schema.org/draft-07/schema",
      type: "object",
      properties: {
        values: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      required: ["values"],
    });
  });

  it("removes other fields from values object schema", () => {
    const schema = {
      $schema: "http://json-schema.org/draft-07/schema",
      type: "object",
      properties: {
        values: {
          type: "object",
          properties: {
            name: { type: "string" },
            foobar: { type: "string" },
            extra: { type: "string" },
          },
          required: ["name", "foobar"],
        },
      },
      required: ["values"],
    };

    expect(schemaForSpecificValuesFields(schema, [])).toEqual({
      $schema: "http://json-schema.org/draft-07/schema",
      type: "object",
      properties: {
        values: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      required: ["values"],
    });

    expect(schemaForSpecificValuesFields(schema, ["name"])).toEqual({
      $schema: "http://json-schema.org/draft-07/schema",
      type: "object",
      properties: {
        values: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
          required: ["name"],
        },
      },
      required: ["values"],
    });

    expect(schemaForSpecificValuesFields(schema, ["name", "extra"])).toEqual({
      $schema: "http://json-schema.org/draft-07/schema",
      type: "object",
      properties: {
        values: {
          type: "object",
          properties: {
            extra: { type: "string" },
            name: { type: "string" },
          },
          required: ["name"],
        },
      },
      required: ["values"],
    });

    expect(
      schemaForSpecificValuesFields(schema, ["name", "foobar", "extra"])
    ).toEqual({
      $schema: "http://json-schema.org/draft-07/schema",
      type: "object",
      properties: {
        values: {
          type: "object",
          properties: {
            extra: { type: "string" },
            foobar: { type: "string" },
            name: { type: "string" },
          },
          required: ["name", "foobar"],
        },
      },
      required: ["values"],
    });
  });
});
