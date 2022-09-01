import { components } from "../generated/apiSchema";
import { mockAppCharts } from "../testUtils/mockAppCharts";
import { mockKubernetes } from "../testUtils/mockKubernetes";
import { nockHttp } from "../testUtils/nockHttp";
import { restoreAllMocks } from "../testUtils/restoreAllMocks";
import Apps from "./Apps";

restoreAllMocks();
nockHttp();
const AppCharts = mockAppCharts();
const kubernetes = mockKubernetes();

const appChartBase: components["schemas"]["AppChart"] = {
  id: "foobar-app-chart-1",
  chart: {
    internalChartName: "foobar-app-chart",
  },
  spec: {
    version: "v1",
    historyMax: 10,
    terminology: {
      singular: "not used",
      plural: "not used",
      singularCapitalized: "not used",
      pluralCapitalized: "not used",
    },
    tabs: [],
    logTargets: [],
    serviceTargets: [],
    metricsTargets: [],
    fields: [
      {
        id: "name",
        name: "Name",
        input: {
          type: "SingleLineText",
        },
      },
    ],
    configurationCards: [["name"]],
    releaseCards: [],
    listCard: {
      nameFieldId: "",
    },
  },
  schema: {
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
  },
};

describe("create", () => {
  it("throws if app chart does not exist", async () => {
    AppCharts.find.mockImplementation(async () => {
      throw new Error("mocked exception, app chart not found");
    });

    await expect(async () => {
      await Apps.create({
        projectId: "foobar-project-1",
        appChartId: "does-not-exist",
        values: {},
      });
    }).rejects.toThrow(/mocked exception, app chart not found/);

    expect(kubernetes.createSecret).toHaveBeenCalledTimes(0);
  });

  it("creates and returns app", async () => {
    kubernetes.createSecret.mockResolvedValueOnce({});
    AppCharts.find.mockImplementation(async (appChartId) => {
      if (appChartId === "foobar-app-chart-1") {
        return {
          ...appChartBase,
          spec: {
            ...appChartBase.spec,
            fields: [
              ...appChartBase.spec.fields,
              {
                id: "foobar-field-1",
                name: "Foobar Field 1",
                input: {
                  type: "SingleLineText",
                },
              },
            ],
            configurationCards: [
              ...appChartBase.spec.configurationCards,
              ["foobar-field-1"],
            ],
          },
        };
      }
      throw new Error("mocked exception, app chart not found");
    });
    const mockedCreatedApp: components["schemas"]["App"] = {
      id: "foobar-app-1",
      projectId: "foobar-project-1",
      appChartId: "foobar-app-chart-1",
      name: "Example Name",
      values: {
        name: "Example Name",
        "foobar-field-1": "example value",
      },
    };
    jest.spyOn(Apps, "find").mockImplementation(async () => {
      return mockedCreatedApp;
    });

    const returnedApp = await Apps.create({
      projectId: "foobar-project-1",
      appChartId: "foobar-app-chart-1",
      values: {
        name: "Example Name",
        "foobar-field-1": "example value",
      },
    });

    expect(kubernetes.createSecret).toHaveBeenCalledTimes(1);
    expect(kubernetes.createSecret).toHaveBeenNthCalledWith(
      1,
      "foobar-project-1",
      {
        metadata: {
          namespace: "foobar-project-1",
          name: expect.any(String),
          labels: {
            "app.kubernetes.io/managed-by": "shipmight",
            "app.shipmight.com/app-chart-id": "foobar-app-chart-1",
            "app.shipmight.com/id": expect.any(String),
            "app.shipmight.com/project-id": "foobar-project-1",
          },
          annotations: {
            "app.shipmight.com/name": "Example Name",
          },
        },
        data: {
          values:
            "eyJuYW1lIjoiRXhhbXBsZSBOYW1lIiwiZm9vYmFyLWZpZWxkLTEiOiJleGFtcGxlIHZhbHVlIn0=",
        },
      }
    );
    const appId = kubernetes.createSecret.mock.calls[0][1].metadata.name;
    expect(
      kubernetes.createSecret.mock.calls[0][1].metadata.labels[
        "app.shipmight.com/id"
      ]
    ).toEqual(appId);
    expect(Apps.find).toHaveBeenCalledTimes(1);
    expect(Apps.find).nthCalledWith(1, appId);
    expect(returnedApp).toBe(mockedCreatedApp);
  });

  it("adds link label for FileMounts", async () => {
    kubernetes.createSecret.mockResolvedValueOnce({});
    AppCharts.find.mockImplementation(async (appChartId) => {
      if (appChartId === "foobar-app-chart-1") {
        return {
          ...appChartBase,
          spec: {
            ...appChartBase.spec,
            fields: [
              ...appChartBase.spec.fields,
              {
                id: "foobar-field-1",
                name: "Foobar Field 1",
                input: {
                  type: "FileMounts",
                },
              },
            ],
            configurationCards: [
              ...appChartBase.spec.configurationCards,
              ["foobar-field-1"],
            ],
          },
        };
      }
      throw new Error("mocked exception, app chart not found");
    });
    jest.spyOn(Apps, "find").mockImplementation(async () => {
      const mockedCreatedApp: components["schemas"]["App"] = {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example Name",
        values: {
          name: "Example Name",
          "foobar-field-1": [
            { fileId: "foobar-file-1", mountPath: "/var/data/foobar" },
          ],
        },
      };
      return mockedCreatedApp;
    });

    await Apps.create({
      projectId: "foobar-project-1",
      appChartId: "foobar-app-chart-1",
      values: {
        name: "Example Name",
        "foobar-field-1": [
          { fileId: "foobar-file-1", mountPath: "/var/data/foobar" },
        ],
      },
    });

    expect(kubernetes.createSecret).toHaveBeenCalledTimes(1);
    expect(
      kubernetes.createSecret.mock.calls[0][1].metadata.labels
    ).toMatchObject({
      "app.shipmight.com/linked-file-id.foobar-file-1": "true",
    });
  });

  it("adds link label for RegistrySelect", async () => {
    kubernetes.createSecret.mockResolvedValueOnce({});
    AppCharts.find.mockImplementation(async (appChartId) => {
      if (appChartId === "foobar-app-chart-1") {
        return {
          ...appChartBase,
          spec: {
            ...appChartBase.spec,
            fields: [
              ...appChartBase.spec.fields,
              {
                id: "foobar-field-1",
                name: "Foobar Field 1",
                input: {
                  type: "RegistrySelect",
                },
              },
            ],
            configurationCards: [
              ...appChartBase.spec.configurationCards,
              ["foobar-field-1"],
            ],
          },
        };
      }
      throw new Error("mocked exception, app chart not found");
    });
    jest.spyOn(Apps, "find").mockImplementation(async () => {
      const mockedCreatedApp: components["schemas"]["App"] = {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example Name",
        values: {
          name: "Example Name",
          "foobar-field-1": "foobar-registry-1",
        },
      };
      return mockedCreatedApp;
    });

    await Apps.create({
      projectId: "foobar-project-1",
      appChartId: "foobar-app-chart-1",
      values: {
        name: "Example Name",
        "foobar-field-1": "foobar-registry-1",
      },
    });

    expect(kubernetes.createSecret).toHaveBeenCalledTimes(1);
    expect(
      kubernetes.createSecret.mock.calls[0][1].metadata.labels
    ).toMatchObject({
      "app.shipmight.com/linked-registry-id.foobar-registry-1": "true",
    });
  });

  it("validates values based on app chart schema", async () => {
    kubernetes.createSecret.mockResolvedValueOnce({});
    AppCharts.find.mockImplementation(async (appChartId) => {
      if (appChartId === "foobar-app-chart-1") {
        return {
          ...appChartBase,
          spec: {
            ...appChartBase.spec,
            fields: [
              ...appChartBase.spec.fields,
              {
                id: "foobar-field-1",
                name: "Foobar Field 1",
                input: {
                  type: "SingleLineText",
                },
              },
            ],
            configurationCards: [
              ...appChartBase.spec.configurationCards,
              ["foobar-field-1"],
            ],
          },
          schema: {
            $schema: "http://json-schema.org/draft-07/schema",
            type: "object",
            properties: {
              values: {
                type: "object",
                properties: {
                  "foobar-field-1": {
                    type: "string",
                    minLength: 10,
                  },
                },
                required: ["foobar-field-1"],
              },
            },
            required: ["values"],
          },
        };
      }
      throw new Error("mocked exception, app chart not found");
    });

    await expect(async () => {
      await Apps.create({
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        values: {
          name: "Example Name",
          "foobar-field-1": "test",
        },
      });
    }).rejects.toThrow(/validation failed/);

    expect(kubernetes.createSecret).toHaveBeenCalledTimes(0);
  });

  it("ignores values not specified in configurationCards", async () => {
    kubernetes.createSecret.mockResolvedValueOnce({});
    AppCharts.find.mockImplementation(async (appChartId) => {
      if (appChartId === "foobar-app-chart-1") {
        return {
          ...appChartBase,
        };
      }
      throw new Error("mocked exception, app chart not found");
    });
    jest.spyOn(Apps, "find").mockImplementation(async () => {
      const mockedCreatedApp: components["schemas"]["App"] = {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example Name",
        values: {
          name: "Example Name",
          "foobar-field-1": "this should be ignored",
        },
      };
      return mockedCreatedApp;
    });

    await Apps.create({
      projectId: "foobar-project-1",
      appChartId: "foobar-app-chart-1",
      values: {
        name: "Example Name",
        "foobar-field-1": "this should be ignored",
      },
    });

    expect(kubernetes.createSecret).toHaveBeenCalledTimes(1);
    expect(kubernetes.createSecret.mock.calls[0][1].data).toMatchObject({
      values: "eyJuYW1lIjoiRXhhbXBsZSBOYW1lIn0=",
    });
  });
});

describe("update", () => {
  it("throws if app does not exist", async () => {
    jest.spyOn(Apps, "find").mockImplementation(async () => {
      throw new Error("mocked exception, app not found");
    });

    await expect(async () => {
      await Apps.update("foobar-app-1", {});
    }).rejects.toThrow(/mocked exception, app not found/);

    expect(kubernetes.replaceSecret).toHaveBeenCalledTimes(0);
  });

  it("throws if app chart does not exist", async () => {
    jest.spyOn(Apps, "find").mockImplementation(async () => {
      return {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example app",
        values: {},
      };
    });
    AppCharts.find.mockImplementation(async () => {
      throw new Error("mocked exception, app chart not found");
    });

    await expect(async () => {
      await Apps.update("foobar-app-1", {});
    }).rejects.toThrow(/mocked exception, app chart not found/);

    expect(kubernetes.replaceSecret).toHaveBeenCalledTimes(0);
  });

  it("updates and returns app", async () => {
    kubernetes.replaceSecret.mockResolvedValueOnce({});
    AppCharts.find.mockImplementation(async (appChartId) => {
      if (appChartId === "foobar-app-chart-1") {
        return {
          ...appChartBase,
          spec: {
            ...appChartBase.spec,
            fields: [
              ...appChartBase.spec.fields,
              {
                id: "foobar-field-1",
                name: "Foobar Field 1",
                input: {
                  type: "SingleLineText",
                },
              },
            ],
            configurationCards: [
              ...appChartBase.spec.configurationCards,
              ["foobar-field-1"],
            ],
          },
        };
      }
      throw new Error("mocked exception, app chart not found");
    });
    const originalApp: components["schemas"]["App"] = {
      id: "foobar-app-1",
      projectId: "foobar-project-1",
      appChartId: "foobar-app-chart-1",
      name: "Example Name",
      values: {
        name: "Example Name",
        "foobar-field-1": "example value",
      },
    };
    const mockedUpdatedApp: components["schemas"]["App"] = {
      id: "foobar-app-1",
      projectId: "foobar-project-1",
      appChartId: "foobar-app-chart-1",
      name: "Different name",
      values: {
        name: "Different name",
        "foobar-field-1": "this value has been updated",
      },
    };
    jest.spyOn(Apps, "find").mockImplementationOnce(async () => {
      return originalApp;
    });
    jest.spyOn(Apps, "find").mockImplementationOnce(async () => {
      return mockedUpdatedApp;
    });

    const returnedApp = await Apps.update("foobar-app-1", {
      name: "Example Name",
      "foobar-field-1": "example value",
    });

    expect(kubernetes.replaceSecret).toHaveBeenCalledTimes(1);
    expect(kubernetes.replaceSecret).toHaveBeenNthCalledWith(
      1,
      "foobar-project-1",
      "foobar-app-1",
      {
        metadata: {
          namespace: "foobar-project-1",
          name: expect.any(String),
          labels: {
            "app.kubernetes.io/managed-by": "shipmight",
            "app.shipmight.com/app-chart-id": "foobar-app-chart-1",
            "app.shipmight.com/id": expect.any(String),
            "app.shipmight.com/project-id": "foobar-project-1",
          },
          annotations: {
            "app.shipmight.com/name": "Example Name",
          },
        },
        data: {
          values:
            "eyJuYW1lIjoiRXhhbXBsZSBOYW1lIiwiZm9vYmFyLWZpZWxkLTEiOiJleGFtcGxlIHZhbHVlIn0=",
        },
      }
    );
    const appId = kubernetes.replaceSecret.mock.calls[0][2].metadata.name;
    expect(
      kubernetes.replaceSecret.mock.calls[0][2].metadata.labels[
        "app.shipmight.com/id"
      ]
    ).toEqual(appId);
    expect(Apps.find).toHaveBeenCalledTimes(2);
    expect(Apps.find).nthCalledWith(1, appId);
    expect(Apps.find).nthCalledWith(2, appId);
    expect(returnedApp).toBe(mockedUpdatedApp);
  });

  it("adds link label for FileMounts", async () => {
    kubernetes.replaceSecret.mockResolvedValueOnce({});
    AppCharts.find.mockImplementation(async (appChartId) => {
      if (appChartId === "foobar-app-chart-1") {
        return {
          ...appChartBase,
          spec: {
            ...appChartBase.spec,
            fields: [
              ...appChartBase.spec.fields,
              {
                id: "foobar-field-1",
                name: "Foobar Field 1",
                input: {
                  type: "FileMounts",
                },
              },
            ],
            configurationCards: [
              ...appChartBase.spec.configurationCards,
              ["foobar-field-1"],
            ],
          },
        };
      }
      throw new Error("mocked exception, app chart not found");
    });
    jest.spyOn(Apps, "find").mockImplementationOnce(async () => {
      const originalApp: components["schemas"]["App"] = {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example Name",
        values: {
          name: "Example Name",
          "foobar-field-1": [],
        },
      };
      return originalApp;
    });
    jest.spyOn(Apps, "find").mockImplementation(async () => {
      const mockedUpdatedApp: components["schemas"]["App"] = {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example Name",
        values: {
          name: "Example Name",
          "foobar-field-1": [
            { fileId: "foobar-file-1", mountPath: "/var/data/foobar" },
          ],
        },
      };
      return mockedUpdatedApp;
    });

    await Apps.update("foobar-app-1", {
      name: "Example Name",
      "foobar-field-1": [
        { fileId: "foobar-file-1", mountPath: "/var/data/foobar" },
      ],
    });

    expect(kubernetes.replaceSecret).toHaveBeenCalledTimes(1);
    expect(
      kubernetes.replaceSecret.mock.calls[0][2].metadata.labels
    ).toMatchObject({
      "app.shipmight.com/linked-file-id.foobar-file-1": "true",
    });
  });

  it("adds link label for RegistrySelect", async () => {
    kubernetes.replaceSecret.mockResolvedValueOnce({});
    AppCharts.find.mockImplementation(async (appChartId) => {
      if (appChartId === "foobar-app-chart-1") {
        return {
          ...appChartBase,
          spec: {
            ...appChartBase.spec,
            fields: [
              ...appChartBase.spec.fields,
              {
                id: "foobar-field-1",
                name: "Foobar Field 1",
                input: {
                  type: "RegistrySelect",
                },
              },
            ],
            configurationCards: [
              ...appChartBase.spec.configurationCards,
              ["foobar-field-1"],
            ],
          },
        };
      }
      throw new Error("mocked exception, app chart not found");
    });
    jest.spyOn(Apps, "find").mockImplementationOnce(async () => {
      const originalApp: components["schemas"]["App"] = {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example Name",
        values: {
          name: "Example Name",
          "foobar-field-1": "",
        },
      };
      return originalApp;
    });
    jest.spyOn(Apps, "find").mockImplementation(async () => {
      const mockedUpdatedApp: components["schemas"]["App"] = {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example Name",
        values: {
          name: "Example Name",
          "foobar-field-1": "foobar-registry-1",
        },
      };
      return mockedUpdatedApp;
    });

    await Apps.update("foobar-app-1", {
      name: "Example Name",
      "foobar-field-1": "foobar-registry-1",
    });

    expect(kubernetes.replaceSecret).toHaveBeenCalledTimes(1);
    expect(
      kubernetes.replaceSecret.mock.calls[0][2].metadata.labels
    ).toMatchObject({
      "app.shipmight.com/linked-registry-id.foobar-registry-1": "true",
    });
  });

  it("removes link label for FileMounts", async () => {
    kubernetes.replaceSecret.mockResolvedValueOnce({});
    AppCharts.find.mockImplementation(async (appChartId) => {
      if (appChartId === "foobar-app-chart-1") {
        return {
          ...appChartBase,
          spec: {
            ...appChartBase.spec,
            fields: [
              ...appChartBase.spec.fields,
              {
                id: "foobar-field-1",
                name: "Foobar Field 1",
                input: {
                  type: "FileMounts",
                },
              },
            ],
            configurationCards: [
              ...appChartBase.spec.configurationCards,
              ["foobar-field-1"],
            ],
          },
        };
      }
      throw new Error("mocked exception, app chart not found");
    });
    jest.spyOn(Apps, "find").mockImplementationOnce(async () => {
      const originalApp: components["schemas"]["App"] = {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example Name",
        values: {
          name: "Example Name",
          "foobar-field-1": [
            { fileId: "foobar-file-1", mountPath: "/var/data/foobar" },
          ],
        },
      };
      return originalApp;
    });
    jest.spyOn(Apps, "find").mockImplementation(async () => {
      const mockedUpdatedApp: components["schemas"]["App"] = {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example Name",
        values: {
          name: "Example Name",
          "foobar-field-1": [],
        },
      };
      return mockedUpdatedApp;
    });

    await Apps.update("foobar-app-1", {
      name: "Example Name",
      "foobar-field-1": [],
    });

    expect(kubernetes.replaceSecret).toHaveBeenCalledTimes(1);
    expect(
      kubernetes.replaceSecret.mock.calls[0][2].metadata.labels
    ).not.toHaveProperty("app.shipmight.com/linked-file-id.foobar-file-1");
  });

  it("removes link label for RegistrySelect", async () => {
    kubernetes.replaceSecret.mockResolvedValueOnce({});
    AppCharts.find.mockImplementation(async (appChartId) => {
      if (appChartId === "foobar-app-chart-1") {
        return {
          ...appChartBase,
          spec: {
            ...appChartBase.spec,
            fields: [
              ...appChartBase.spec.fields,
              {
                id: "foobar-field-1",
                name: "Foobar Field 1",
                input: {
                  type: "RegistrySelect",
                },
              },
            ],
            configurationCards: [
              ...appChartBase.spec.configurationCards,
              ["foobar-field-1"],
            ],
          },
        };
      }
      throw new Error("mocked exception, app chart not found");
    });
    jest.spyOn(Apps, "find").mockImplementationOnce(async () => {
      const originalApp: components["schemas"]["App"] = {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example Name",
        values: {
          name: "Example Name",
          "foobar-field-1": "foobar-registry-1",
        },
      };
      return originalApp;
    });
    jest.spyOn(Apps, "find").mockImplementation(async () => {
      const mockedUpdatedApp: components["schemas"]["App"] = {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example Name",
        values: {
          name: "Example Name",
          "foobar-field-1": "",
        },
      };
      return mockedUpdatedApp;
    });

    await Apps.update("foobar-app-1", {
      name: "Example Name",
      "foobar-field-1": "",
    });

    expect(kubernetes.replaceSecret).toHaveBeenCalledTimes(1);
    expect(
      kubernetes.replaceSecret.mock.calls[0][2].metadata.labels
    ).not.toHaveProperty(
      "app.shipmight.com/linked-registry-id.foobar-registry-1"
    );
  });

  it("validates values based on app chart schema", async () => {
    kubernetes.replaceSecret.mockResolvedValueOnce({});
    AppCharts.find.mockImplementation(async (appChartId) => {
      if (appChartId === "foobar-app-chart-1") {
        return {
          ...appChartBase,
          spec: {
            ...appChartBase.spec,
            fields: [
              ...appChartBase.spec.fields,
              {
                id: "foobar-field-1",
                name: "Foobar Field 1",
                input: {
                  type: "SingleLineText",
                },
              },
            ],
            configurationCards: [
              ...appChartBase.spec.configurationCards,
              ["foobar-field-1"],
            ],
          },
          schema: {
            $schema: "http://json-schema.org/draft-07/schema",
            type: "object",
            properties: {
              values: {
                type: "object",
                properties: {
                  "foobar-field-1": {
                    type: "string",
                    minLength: 10,
                  },
                },
                required: ["foobar-field-1"],
              },
            },
            required: ["values"],
          },
        };
      }
      throw new Error("mocked exception, app chart not found");
    });
    jest.spyOn(Apps, "find").mockImplementationOnce(async () => {
      const originalApp: components["schemas"]["App"] = {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example Name",
        values: {
          name: "Example Name",
          "foobar-field-1": "foobar-registry-1",
        },
      };
      return originalApp;
    });

    await expect(async () => {
      await Apps.update("foobar-app-1", {
        name: "Example Name",
        "foobar-field-1": "test",
      });
    }).rejects.toThrow(/validation failed/);

    expect(kubernetes.replaceSecret).toHaveBeenCalledTimes(0);
  });

  it("ignores values not specified in configurationCards", async () => {
    kubernetes.replaceSecret.mockResolvedValueOnce({});
    AppCharts.find.mockImplementation(async (appChartId) => {
      if (appChartId === "foobar-app-chart-1") {
        return {
          ...appChartBase,
        };
      }
      throw new Error("mocked exception, app chart not found");
    });
    jest.spyOn(Apps, "find").mockImplementation(async () => {
      const originalApp: components["schemas"]["App"] = {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example Name",
        values: {
          name: "Example Name",
        },
      };
      return originalApp;
    });
    jest.spyOn(Apps, "find").mockImplementation(async () => {
      const mockedUpdatedApp: components["schemas"]["App"] = {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example Name",
        values: {
          name: "Example Name",
        },
      };
      return mockedUpdatedApp;
    });

    await Apps.update("foobar-app-1", {
      name: "Example Name",
      "foobar-field-1": "this should be ignored",
    });

    expect(kubernetes.replaceSecret).toHaveBeenCalledTimes(1);
    expect(kubernetes.replaceSecret.mock.calls[0][2].data).toMatchObject({
      values: "eyJuYW1lIjoiRXhhbXBsZSBOYW1lIn0=",
    });
  });
});
