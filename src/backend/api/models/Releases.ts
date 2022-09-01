import { V1Secret } from "@kubernetes/client-node";
import { formatISO } from "date-fns";
import { gunzipSync } from "zlib";
import { listNamespacedSecrets } from "../../utils/kubernetes";
import { getRandomId } from "../../utils/string";
import {
  jsonSchemaValidate,
  schemaForSpecificValuesFields,
  valuesForSpecificFields,
} from "../../utils/validation";
import { components } from "../generated/apiSchema";
import queue from "../queue";
import AppCharts from "./AppCharts";
import Apps from "./Apps";

type Release = components["schemas"]["Release"];

const secretToRelease = (secret: V1Secret): Release => {
  const baseData = Buffer.from(secret.data.release, "base64").toString("utf-8");
  const helmGzippedData = Buffer.from(baseData, "base64");
  const stringData = gunzipSync(helmGzippedData);
  const data = JSON.parse(stringData.toString("utf-8"));

  const releaseId = data.config.builtIns.releaseId;

  return {
    id: releaseId,
    projectId: data.namespace,
    appId: data.config.builtIns.appId,
    values: data.config.values,
    createdAt: formatISO(secret.metadata.creationTimestamp),
  };
};

export default class Releases {
  static async list(appId: string): Promise<Release[]> {
    const app = await Apps.find(appId);
    const secrets = await listNamespacedSecrets(
      app.projectId,
      `owner=helm,name=${appId}`
    );
    const releases = secrets.map((secret) => {
      return secretToRelease(secret);
    });
    releases.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    return releases;
  }

  static async create(
    {
      appId,
      values: rawValues,
    }: Omit<Release, "id" | "projectId" | "createdAt" | "podStatuses">,
    requestId?: string
  ): Promise<void> {
    const app = await Apps.find(appId);
    const appChart = await AppCharts.find(app.appChartId);

    const cards = appChart.spec.releaseCards;
    const fieldIds = cards.flatMap((card) => [...card]);
    const schema = schemaForSpecificValuesFields(appChart.schema, fieldIds);
    const values = valuesForSpecificFields(rawValues, fieldIds);
    jsonSchemaValidate(schema, values);

    const releaseId = getRandomId();

    queue.schedule({
      taskType: "releaseApp",
      appId,
      releaseId,
      values,
      requestId,
    });
  }
}
