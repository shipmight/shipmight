import { jsonSchemaValuesValidator, validateOpenApiPath } from "./validation";

describe("schemaForSpecificValuesFields", () => {
  it("works", () => {
    // Covered by tests in `src/backend/utils/validation.test.ts`
  });
});

describe("validateOpenApiPath", () => {
  it("works for simple objects", () => {
    const validate = validateOpenApiPath("/v1/tokens");

    expect(validate({ username: "", password: "" })).toEqual({
      password: "cannot be empty",
      username: "cannot be empty",
    });
    expect(validate({ username: "asd", password: "" })).toEqual({
      password: "cannot be empty",
    });
    expect(validate({ username: "", password: "asd" })).toEqual({
      username: "cannot be empty",
    });
    expect(validate({ username: "asd", password: "asd" })).toEqual({});
  });
});

describe("jsonSchemaValuesValidator", () => {
  it("throws if schema does not contain a values object", () => {
    expect(() =>
      jsonSchemaValuesValidator({
        $schema: "http://json-schema.org/draft-07/schema",
        type: "object",
        properties: {
          name: { type: "string" },
          foobar: { type: "string" },
          extra: { type: "string" },
        },
        required: ["name", "foobar"],
      })
    ).toThrow(/expected a schema containing values object/);
  });

  it("supports required", () => {
    const validate = jsonSchemaValuesValidator({
      $schema: "http://json-schema.org/draft-07/schema",
      type: "object",
      properties: {
        values: {
          type: "object",
          properties: {
            name: { type: "string" },
            foobar: { type: "string" },
          },
          required: ["name", "foobar"],
        },
      },
      required: ["values"],
    });

    expect(validate({})).toEqual({
      foobar: "is required",
      name: "is required",
    });

    expect(validate({ name: "hey" })).toEqual({
      foobar: "is required",
    });
  });

  it("supports string", () => {
    const validate = jsonSchemaValuesValidator({
      $schema: "http://json-schema.org/draft-07/schema",
      type: "object",
      properties: {
        values: {
          type: "object",
          properties: {
            name: {
              type: "string",
              minLength: 1,
            },
          },
          required: ["name"],
        },
      },
      required: ["values"],
    });

    expect(validate({ name: "" })).toEqual({
      name: "cannot be empty",
    });
  });

  it("supports number", () => {
    const validate = jsonSchemaValuesValidator({
      $schema: "http://json-schema.org/draft-07/schema",
      type: "object",
      properties: {
        values: {
          type: "object",
          properties: {
            memoryMb: { type: "number", minimum: 128, maximum: 1024000 },
          },
          required: ["memoryMb"],
        },
      },
      required: ["values"],
    });

    expect(validate({ memoryMb: "" })).toEqual({
      memoryMb: "is invalid",
    });

    expect(validate({ memoryMb: 5 })).toEqual({
      memoryMb: "must be 128 or greater",
    });

    expect(validate({ memoryMb: 500000000000 })).toEqual({
      memoryMb: "must be 1024000 or less",
    });
  });

  it("supports number that can also be set to empty string", () => {
    const validate = jsonSchemaValuesValidator({
      $schema: "http://json-schema.org/draft-07/schema",
      type: "object",
      properties: {
        values: {
          type: "object",
          properties: {
            activeDeadlineSeconds: {
              anyOf: [
                { type: "string", maxLength: 0 },
                { type: "number", minimum: 5, maximum: 10 },
              ],
            },
          },
          required: ["activeDeadlineSeconds"],
        },
      },
      required: ["values"],
    });

    expect(validate({ activeDeadlineSeconds: "" })).toEqual({});

    expect(validate({ activeDeadlineSeconds: 2 })).toEqual({
      activeDeadlineSeconds: "must be 5 or greater",
    });

    expect(validate({ activeDeadlineSeconds: 500000000000 })).toEqual({
      activeDeadlineSeconds: "must be 10 or less",
    });
  });

  it("supports arrays", () => {
    const validate = jsonSchemaValuesValidator({
      $schema: "http://json-schema.org/draft-07/schema",
      type: "object",
      properties: {
        values: {
          type: "object",
          properties: {
            files: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  fileId: {
                    type: "string",
                    minLength: 1,
                  },
                  mountPath: {
                    type: "string",
                    minLength: 1,
                  },
                },
                required: ["fileId", "mountPath"],
              },
            },
          },
          required: ["files"],
        },
      },
      required: ["values"],
    });

    expect(validate({ files: [] })).toEqual({});

    expect(
      validate({
        files: [{ fileId: "file-1", mountPath: "" }],
      })
    ).toEqual({
      files: [{ mountPath: "cannot be empty" }],
    });

    expect(
      validate({
        files: [
          { fileId: "file-1", mountPath: "valid" },
          { fileId: "file-2", mountPath: "" },
        ],
      })
    ).toEqual({
      files: [undefined, { mountPath: "cannot be empty" }],
    });
  });
});
