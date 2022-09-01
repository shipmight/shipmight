import { parseISO } from "date-fns";
import { gzipSync } from "zlib";
import { toBase64 } from "../../utils/string";
import { mockAppCharts } from "../testUtils/mockAppCharts";
import { mockApps } from "../testUtils/mockApps";
import { mockKubernetes } from "../testUtils/mockKubernetes";
import { mockQueue } from "../testUtils/mockQueue";
import Releases from "./Releases";

const Apps = mockApps();
const AppCharts = mockAppCharts();
const queue = mockQueue();
const kubernetes = mockKubernetes();

describe("list", () => {
  beforeEach(() => {
    Apps.find.mockImplementationOnce(async (appId) => {
      if (appId === "foobar-app-1") {
        return {
          id: "foobar-app-1",
          projectId: "foobar-project-1",
          appChartId: "foobar-app-chart-1",
          name: "Foobar App",
          values: {},
        };
      }
      throw new Error("mocked app not found error");
    });
  });

  it("returns empty list", async () => {
    kubernetes.listNamespacedSecrets.mockResolvedValueOnce([]);

    const releases = await Releases.list("foobar-app-1");

    expect(kubernetes.listNamespacedSecrets).toHaveBeenNthCalledWith(
      1,
      "foobar-project-1",
      "owner=helm,name=foobar-app-1"
    );
    expect(releases).toEqual([]);
  });

  it("returns deployments from Helm releases", async () => {
    kubernetes.listNamespacedSecrets.mockResolvedValueOnce([
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-30T08:59:46Z"),
        },
        data: {
          release: toBase64(
            gzipSync(
              JSON.stringify({
                namespace: "foobar-project-1",
                config: {
                  builtIns: {
                    releaseId: "foobar-release-1",
                    appId: "foobar-app-1",
                  },
                  values: {
                    foobarValue: "hey",
                  },
                },
              })
            ).toString("base64")
          ),
        },
      },
    ]);

    const releases = await Releases.list("foobar-app-1");

    expect(kubernetes.listNamespacedSecrets).toHaveBeenNthCalledWith(
      1,
      "foobar-project-1",
      "owner=helm,name=foobar-app-1"
    );
    expect(releases).toEqual([
      {
        id: "foobar-release-1",
        projectId: "foobar-project-1",
        appId: "foobar-app-1",
        createdAt: "2022-08-30T08:59:46Z",
        values: {
          foobarValue: "hey",
        },
      },
    ]);
  });

  it("sorts deployment by createdAt", async () => {
    const payload = toBase64(
      gzipSync(
        JSON.stringify({
          namespace: "foobar-project-1",
          config: {
            builtIns: {
              releaseId: "foobar-release-1",
              appId: "foobar-app-1",
            },
            values: {},
          },
        })
      ).toString("base64")
    );
    kubernetes.listNamespacedSecrets.mockResolvedValueOnce([
      {
        metadata: { creationTimestamp: parseISO("2022-08-25T08:59:46Z") },
        data: { release: payload },
      },
      {
        metadata: { creationTimestamp: parseISO("2022-08-20T08:59:46Z") },
        data: { release: payload },
      },
      {
        metadata: { creationTimestamp: parseISO("2022-08-30T08:59:46Z") },
        data: { release: payload },
      },
    ]);

    const releases = await Releases.list("foobar-app-1");

    expect(releases).toMatchObject([
      { createdAt: "2022-08-30T08:59:46Z" },
      { createdAt: "2022-08-25T08:59:46Z" },
      { createdAt: "2022-08-20T08:59:46Z" },
    ]);
  });
});

describe("create", () => {
  beforeEach(() => {
    Apps.find.mockImplementationOnce(async (appId) => {
      if (appId === "foobar-app-1") {
        return {
          id: "foobar-app-1",
          projectId: "foobar-project-1",
          appChartId: "foobar-app-chart-1",
          name: "Foobar App",
          values: {},
        };
      }
      throw new Error("mocked app not found error");
    });
    AppCharts.find.mockImplementationOnce(async (appChartId) => {
      if (appChartId === "foobar-app-chart-1") {
        return {
          id: "foobar-app-1",
          chart: {
            internalChartName: "applications",
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
                id: "foobar-field-1",
                name: "Foobar Field 1",
                input: {
                  type: "SingleLineText",
                },
              },
            ],
            configurationCards: [],
            releaseCards: [["foobar-field-1"]],
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
                properties: {
                  "foobar-field-1": {
                    type: "string",
                    minLength: 1,
                    maxLength: 15,
                  },
                },
                required: ["foobar-field-1"],
              },
            },
            required: ["values"],
          },
        };
      }
      throw new Error("mocked app chart not found error");
    });
  });

  it("queues releaseApp task", async () => {
    await Releases.create({
      appId: "foobar-app-1",
      values: {
        "foobar-field-1": "hello world",
      },
    });

    expect(queue.schedule).toHaveBeenCalledTimes(1);
    expect(queue.schedule).toHaveBeenNthCalledWith(1, {
      taskType: "releaseApp",
      appId: "foobar-app-1",
      releaseId: expect.any(String),
      values: {
        "foobar-field-1": "hello world",
      },
    });
  });

  it("includes requestId in queued task object", async () => {
    await Releases.create(
      {
        appId: "foobar-app-1",
        values: {
          "foobar-field-1": "hello world",
        },
      },
      "foobar-request-id"
    );

    expect(queue.schedule).toHaveBeenCalledTimes(1);
    expect(queue.schedule.mock.calls[0][0].requestId).toEqual(
      "foobar-request-id"
    );
  });

  it("validates values based on app chart schema", async () => {
    await expect(async () => {
      await Releases.create({
        appId: "foobar-app-1",
        values: {},
      });
    }).rejects.toThrow(/validation failed/);

    expect(queue.schedule).toHaveBeenCalledTimes(0);
  });

  it("ignores values not specified in releaseCards", async () => {
    await Releases.create({
      appId: "foobar-app-1",
      values: {
        "foobar-field-1": "hello world",
        extraneous: "whats up",
      },
    });

    expect(queue.schedule).toHaveBeenCalledTimes(1);
    expect(queue.schedule).toHaveBeenNthCalledWith(1, {
      taskType: "releaseApp",
      appId: "foobar-app-1",
      releaseId: expect.any(String),
      values: {
        "foobar-field-1": "hello world",
      },
    });
  });
});
