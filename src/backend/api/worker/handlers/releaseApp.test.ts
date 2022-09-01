import { components } from "../../generated/apiSchema";
import { mockAppCharts } from "../../testUtils/mockAppCharts";
import { mockApps } from "../../testUtils/mockApps";
import { mockFiles } from "../../testUtils/mockFiles";
import { mockHelm } from "../../testUtils/mockHelm";
import { mockRegistries } from "../../testUtils/mockRegistries";
import releaseApp from "./releaseApp";

const Apps = mockApps();
const AppCharts = mockAppCharts();
const Files = mockFiles();
const Registries = mockRegistries();
const helm = mockHelm();

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
    fields: [],
    configurationCards: [],
    releaseCards: [],
    listCard: {
      nameFieldId: "",
    },
  },
  schema: {
    $schema: "http://json-schema.org/draft-07/schema",
    type: "object",
    properties: {},
    required: [],
  },
};

it("upgrades app via helm", async () => {
  AppCharts.find.mockImplementation(async (appChartId) => {
    if (appChartId === "foobar-app-chart-1") {
      return {
        ...appChartBase,
        spec: {
          ...appChartBase.spec,
          fields: [
            {
              id: "first",
              name: "First",
              input: {
                type: "SingleLineText",
              },
            },
            {
              id: "second",
              name: "Second",
              input: {
                type: "SingleLineText",
              },
            },
          ],
          configurationCards: [["first"]],
          releaseCards: [["second"]],
        },
      };
    }
    throw new Error("mocked exception, app chart not found");
  });
  Apps.find.mockImplementation(async (appId) => {
    if (appId === "foobar-app-1") {
      return {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example app",
        values: {
          first: "hey",
        },
      };
    }
    throw new Error("mocked exception, app not found");
  });

  await releaseApp({
    taskType: "releaseApp",
    appId: "foobar-app-1",
    releaseId: "foobar-release-1",
    values: {
      second: "there",
    },
  });

  expect(helm.helmUpgrade).toHaveBeenCalledTimes(1);
  expect(helm.helmUpgrade).toHaveBeenNthCalledWith(
    1,
    {
      chart: { internalChartName: "foobar-app-chart" },
      namespace: "foobar-project-1",
      releaseName: "foobar-app-1",
      values: {
        builtIns: {
          appId: "foobar-app-1",
          releaseId: "foobar-release-1",
          historyMax: 10,
          labels: {
            appId: {
              "ext.shipmight.com/app-id": "foobar-app-1",
            },
            releaseId: {
              "ext.shipmight.com/release-id": "foobar-release-1",
            },
            logTargets: {},
            metricsTargets: {},
            serviceTargets: {},
          },
        },
        values: {
          first: "hey",
          second: "there",
        },
        resolvedValues: {},
      },
    },
    { install: true }
  );
});

it("adds labels for logTargets, serviceTargets and metricsTargets", async () => {
  AppCharts.find.mockImplementation(async (appChartId) => {
    if (appChartId === "foobar-app-chart-1") {
      return {
        ...appChartBase,
        spec: {
          ...appChartBase.spec,
          logTargets: [{ id: "applicationLogs", name: "Application logs" }],
          serviceTargets: [{ id: "applicationPod", name: "Application pod" }],
          metricsTargets: [{ id: "applicationPod", name: "Application pod" }],
        },
      };
    }
    throw new Error("mocked exception, app chart not found");
  });
  Apps.find.mockImplementation(async (appId) => {
    if (appId === "foobar-app-1") {
      return {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example app",
        values: {},
      };
    }
    throw new Error("mocked exception, app not found");
  });

  await releaseApp({
    taskType: "releaseApp",
    appId: "foobar-app-1",
    releaseId: "foobar-release-1",
    values: {},
  });

  expect(helm.helmUpgrade).toHaveBeenCalledTimes(1);
  expect(helm.helmUpgrade).toHaveBeenNthCalledWith(
    1,
    {
      chart: { internalChartName: "foobar-app-chart" },
      namespace: "foobar-project-1",
      releaseName: "foobar-app-1",
      values: {
        builtIns: {
          appId: "foobar-app-1",
          releaseId: "foobar-release-1",
          historyMax: 10,
          labels: {
            appId: {
              "ext.shipmight.com/app-id": "foobar-app-1",
            },
            releaseId: {
              "ext.shipmight.com/release-id": "foobar-release-1",
            },
            logTargets: {
              applicationLogs: {
                "ext.shipmight.com/log-target.applicationLogs": "foobar-app-1",
              },
            },
            metricsTargets: {
              applicationPod: {
                "ext.shipmight.com/metrics-target.applicationPod":
                  "foobar-app-1",
              },
            },
            serviceTargets: {
              applicationPod: {
                "ext.shipmight.com/service-target.applicationPod":
                  "foobar-app-1",
              },
            },
          },
        },
        values: {},
        resolvedValues: {},
      },
    },
    { install: true }
  );
});

it("resolves RegistrySelect field", async () => {
  AppCharts.find.mockImplementation(async (appChartId) => {
    if (appChartId === "foobar-app-chart-1") {
      return {
        ...appChartBase,
        spec: {
          ...appChartBase.spec,
          fields: [
            {
              id: "imageRegistry",
              name: "Image Registry",
              input: {
                type: "RegistrySelect",
              },
            },
            {
              id: "privateImageRegistry",
              name: "Private Image Registry",
              input: {
                type: "RegistrySelect",
              },
            },
          ],
          configurationCards: [["imageRegistry", "privateImageRegistry"]],
          releaseCards: [],
        },
      };
    }
    throw new Error("mocked exception, app chart not found");
  });
  Apps.find.mockImplementation(async (appId) => {
    if (appId === "foobar-app-1") {
      return {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example app",
        values: {
          imageRegistry: "foobar-registry-1",
          privateImageRegistry: "foobar-registry-2",
        },
      };
    }
    throw new Error("mocked exception, app not found");
  });
  Registries.find.mockImplementation(async (registryId) => {
    if (registryId === "foobar-registry-1") {
      return {
        id: "foobar-registry-1",
        name: "Foobar Registry 1",
        url: "registry.example.com",
        authMethod: "NONE",
      };
    }
    if (registryId === "foobar-registry-2") {
      return {
        id: "foobar-registry-2",
        name: "Foobar Registry 2",
        url: "private.registry.example.com",
        authMethod: "TOKEN",
      };
    }
    throw new Error("mocked exception, registry not found");
  });

  await releaseApp({
    taskType: "releaseApp",
    appId: "foobar-app-1",
    releaseId: "foobar-release-1",
    values: {},
  });

  expect(helm.helmUpgrade).toHaveBeenCalledTimes(1);
  expect(helm.helmUpgrade).toHaveBeenNthCalledWith(
    1,
    {
      chart: { internalChartName: "foobar-app-chart" },
      namespace: "foobar-project-1",
      releaseName: "foobar-app-1",
      values: {
        builtIns: {
          appId: "foobar-app-1",
          releaseId: "foobar-release-1",
          historyMax: 10,
          labels: {
            appId: {
              "ext.shipmight.com/app-id": "foobar-app-1",
            },
            releaseId: {
              "ext.shipmight.com/release-id": "foobar-release-1",
            },
            logTargets: {},
            metricsTargets: {},
            serviceTargets: {},
          },
        },
        values: {
          imageRegistry: "foobar-registry-1",
          privateImageRegistry: "foobar-registry-2",
        },
        resolvedValues: {
          imageRegistry: {
            imagePullSecretName: undefined,
            registryUrl: "registry.example.com",
          },
          privateImageRegistry: {
            imagePullSecretName: undefined,
            registryUrl: "private.registry.example.com",
          },
        },
      },
    },
    { install: true }
  );
  expect(Registries.cloneToProject).toHaveBeenCalledTimes(1);
  expect(Registries.cloneToProject).toHaveBeenNthCalledWith(
    1,
    "foobar-registry-2",
    "foobar-project-1"
  );
});

it("resolves FileMounts field", async () => {
  AppCharts.find.mockImplementation(async (appChartId) => {
    if (appChartId === "foobar-app-chart-1") {
      return {
        ...appChartBase,
        spec: {
          ...appChartBase.spec,
          fields: [
            {
              id: "fileMounts",
              name: "File mounts",
              input: {
                type: "FileMounts",
              },
            },
          ],
          configurationCards: [["fileMounts"]],
          releaseCards: [],
        },
      };
    }
    throw new Error("mocked exception, app chart not found");
  });
  Apps.find.mockImplementation(async (appId) => {
    if (appId === "foobar-app-1") {
      return {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example app",
        values: {
          fileMounts: [
            {
              fileId: "foobar-file-1",
              mountPath: "/foobar/mount",
            },
          ],
        },
      };
    }
    throw new Error("mocked exception, app not found");
  });
  Files.getFileMountsList.mockImplementation(async (fileMounts) => {
    return fileMounts.map(({ fileId, mountPath }) => {
      return {
        mountPath: `mocked-mount-path-${mountPath}`,
        fileMountId: `mocked-file-mount-id-${fileId}`,
        secretId: `mocked-secret-id-${fileId}`,
        secretKey: "content",
      };
    });
  });

  await releaseApp({
    taskType: "releaseApp",
    appId: "foobar-app-1",
    releaseId: "foobar-release-1",
    values: {},
  });

  expect(helm.helmUpgrade).toHaveBeenCalledTimes(1);
  expect(helm.helmUpgrade).toHaveBeenNthCalledWith(
    1,
    {
      chart: { internalChartName: "foobar-app-chart" },
      namespace: "foobar-project-1",
      releaseName: "foobar-app-1",
      values: {
        builtIns: {
          appId: "foobar-app-1",
          releaseId: "foobar-release-1",
          historyMax: 10,
          labels: {
            appId: {
              "ext.shipmight.com/app-id": "foobar-app-1",
            },
            releaseId: {
              "ext.shipmight.com/release-id": "foobar-release-1",
            },
            logTargets: {},
            metricsTargets: {},
            serviceTargets: {},
          },
        },
        values: {
          fileMounts: [
            {
              fileId: "foobar-file-1",
              mountPath: "/foobar/mount",
            },
          ],
        },
        resolvedValues: {
          fileMounts: [
            {
              fileMountId: "mocked-file-mount-id-foobar-file-1",
              mountPath: "mocked-mount-path-/foobar/mount",
              secretId: "mocked-secret-id-foobar-file-1",
              secretKey: "content",
            },
          ],
        },
      },
    },
    { install: true }
  );
  expect(Files.getFileMountsList).toHaveBeenCalledTimes(1);
});
