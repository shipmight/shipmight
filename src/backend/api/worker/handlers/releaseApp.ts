import { helmUpgrade } from "../../../utils/helm";
import { getLogger } from "../../../utils/logging";
import Apps from "../../models/Apps";
import AppCharts from "../../models/AppCharts";
import Files from "../../models/Files";
import Registries from "../../models/Registries";
import { QueueTaskOfType } from "../../queue";

const log = getLogger("api:worker:releaseApp");

export default async function releaseApp(
  task: QueueTaskOfType<"releaseApp">
): Promise<void> {
  log.info({
    message: "releasing app",
    releaseId: task.releaseId,
    requestId: task.requestId,
  });

  const app = await Apps.find(task.appId);
  const appChart = await AppCharts.find(app.appChartId);

  const historyMax = appChart.spec.historyMax;

  const builtIns = {
    appId: app.id,
    releaseId: task.releaseId,
    historyMax,
    labels: {
      releaseId: {
        "ext.shipmight.com/release-id": task.releaseId,
      },
      appId: {
        "ext.shipmight.com/app-id": app.id,
      },
      logTargets: appChart.spec.logTargets.reduce<{
        [logTargetId: string]: { [labelKey: string]: string };
      }>((obj, logTarget) => {
        return {
          ...obj,
          [logTarget.id]: {
            [`ext.shipmight.com/log-target.${logTarget.id}`]: app.id,
          },
        };
      }, {}),
      serviceTargets: appChart.spec.serviceTargets.reduce<{
        [logTargetId: string]: { [labelKey: string]: string };
      }>((obj, serviceTarget) => {
        return {
          ...obj,
          [serviceTarget.id]: {
            [`ext.shipmight.com/service-target.${serviceTarget.id}`]: app.id,
          },
        };
      }, {}),
      metricsTargets: appChart.spec.metricsTargets.reduce<{
        [logTargetId: string]: { [labelKey: string]: string };
      }>((obj, metricsTarget) => {
        return {
          ...obj,
          [metricsTarget.id]: {
            [`ext.shipmight.com/metrics-target.${metricsTarget.id}`]: app.id,
          },
        };
      }, {}),
    },
  };

  log.info({
    message: "composed builtIns object for chart",
    builtIns,
    requestId: task.requestId,
  });

  const values = {
    builtIns,

    values: {
      ...app.values,
      ...task.values,
    },

    // Populated next
    resolvedValues: {},
  };

  log.info({
    message: "resolving resolvedValues",
    requestId: task.requestId,
  });

  const promises: Promise<void>[] = [];

  for (const field of appChart.spec.fields) {
    switch (field.input.type) {
      case "RegistrySelect": {
        const registryId = app.values[field.id] as string;
        const promise = Registries.find(registryId).then(async (registry) => {
          let imagePullSecretName: string = undefined;
          if (registry.authMethod === "TOKEN") {
            log.info({
              message: "cloning registry to project",
              registryId: registry.id,
              requestId: task.requestId,
            });
            imagePullSecretName = await Registries.cloneToProject(
              registry.id,
              app.projectId
            );
          }
          values.resolvedValues[field.id] = {
            registryUrl: registry.url,
            imagePullSecretName,
          };
        });
        promises.push(promise);
        break;
      }

      case "FileMounts": {
        const fileMounts = app.values[field.id] as {
          fileId: string;
          mountPath: string;
        }[];
        const promise = Files.getFileMountsList(fileMounts).then((list) => {
          values.resolvedValues[field.id] = list;
        });
        promises.push(promise);
        break;
      }
    }
  }

  log.info({
    message: "waiting for resolvedValues promises",
    promisesLength: promises.length,
    requestId: task.requestId,
  });
  await Promise.all(promises);

  const chart = appChart.chart;
  const namespace = app.projectId;
  const releaseName = app.id;

  log.info({
    message: "upgrading helm release",
    namespace,
    releaseName,
    requestId: task.requestId,
  });

  try {
    await helmUpgrade(
      {
        namespace,
        releaseName,
        chart,
        values,
      },
      { install: true }
    );
  } catch (error) {
    log.error({
      message: "helm upgrade errored",
      error,
      requestId: task.requestId,
    });
    throw error;
  }

  log.info({
    message: "app released",
    requestId: task.requestId,
  });
}
