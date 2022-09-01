import { listNamespacedPods } from "../utils/kubernetes";
import { components } from "./generated/apiSchema";
import { LogSource } from "./logUtils";
import Apps from "./models/Apps";
import AppCharts from "./models/AppCharts";

export const getSystemLogSources = async (
  category: "shipmight" | "kube-system"
): Promise<LogSource[]> => {
  if (category === "shipmight") {
    return [
      {
        id: "cert-manager",
        name: "cert-manager",
        labelQuery: {
          container: "cert-manager",
        },
      },
      {
        id: "ingress-nginx",
        name: "ingress-nginx",
        labelQuery: {
          app_kubernetes_io_name: "ingress-nginx",
        },
      },
      {
        id: "loki",
        name: "loki",
        labelQuery: {
          app: "loki",
        },
      },
      {
        id: "promtail",
        name: "promtail",
        labelQuery: {
          app: "promtail",
        },
      },
      {
        id: "shipmight-api",
        name: "shipmight-api",
        labelQuery: {
          shipmight_component: "api",
        },
      },
      {
        id: "shipmight-ui",
        name: "shipmight-ui",
        labelQuery: {
          shipmight_component: "ui",
        },
      },
    ].sort((a, b) => a.name.localeCompare(b.name));
  }

  if (category === "kube-system") {
    const pods = await listNamespacedPods("kube-system", "");
    return pods
      .map((pod) => {
        return {
          id: pod.metadata.name,
          name: pod.metadata.name,
          labelQuery: {
            pod: pod.metadata.name,
          },
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return [];
};

export const getProjectLogSources = async (
  projectId: string
): Promise<LogSource[]> => {
  const [appChartsById, apps] = await Promise.all([
    AppCharts.list().then((appCharts) =>
      appCharts.reduce<Record<string, components["schemas"]["AppChart"]>>(
        (obj, appChart) => {
          return {
            ...obj,
            [appChart.id]: appChart,
          };
        },
        {}
      )
    ),
    Apps.list(projectId),
  ]);
  const sourceOptions = apps.flatMap((app) => {
    const appChart = appChartsById[app.appChartId];
    const { logTargets } = appChart.spec;
    return logTargets.map((logTarget, index) => {
      return {
        id: `${app.id}-${index}`,
        name: `${app.name}${
          logTargets.length > 1 ? ` (${logTarget.name})` : ""
        }`,
        labelQuery: {
          [`ext_shipmight_com_log_target_${logTarget.id}`]: app.id,
        },
      };
    });
  });
  return sourceOptions.sort((a, b) => a.name.localeCompare(b.name));
};
