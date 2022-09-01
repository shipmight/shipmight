import { components } from "../generated/apiSchema";
import AppCharts from "./AppCharts";
import {
  transformToId,
  getRandomId,
  toBase64,
  fromBase64,
} from "../../utils/string";
import {
  createSecret,
  deleteSecret,
  listSecrets,
  replaceSecret,
} from "../../utils/kubernetes";
import { V1Secret } from "@kubernetes/client-node";
import { getLogger } from "../../utils/logging";
import Domains from "./Domains";
import {
  schemaForSpecificValuesFields,
  jsonSchemaValidate,
  valuesForSpecificFields,
} from "../../utils/validation";

const log = getLogger("api:models:Apps");

type App = components["schemas"]["App"];

const appToSecret = (
  { projectId, appChartId, id, values }: Omit<App, "name">,
  fields: components["schemas"]["AppChart"]["spec"]["fields"]
): V1Secret => {
  const namespace = projectId;
  const kubeName = id;

  const name = values.name as string;

  const relationLabels = {};
  for (const field of fields) {
    if (field.input.type === "FileMounts") {
      const fileMounts = values[field.id] as { fileId: string }[];
      for (const { fileId } of fileMounts) {
        relationLabels[`app.shipmight.com/linked-file-id.${fileId}`] = "true";
      }
    }
    if (field.input.type === "RegistrySelect") {
      const registryId = values[field.id] as string;
      relationLabels[`app.shipmight.com/linked-registry-id.${registryId}`] =
        "true";
    }
  }

  return {
    metadata: {
      namespace,
      name: kubeName,
      labels: {
        "app.kubernetes.io/managed-by": "shipmight",
        "app.shipmight.com/id": id,
        "app.shipmight.com/app-chart-id": appChartId,
        "app.shipmight.com/project-id": projectId,
        ...relationLabels,
      },
      annotations: {
        "app.shipmight.com/name": name,
      },
    },
    data: {
      values: toBase64(JSON.stringify(values)),
    },
  };
};

const secretToApp = (secret: V1Secret): App => {
  return {
    id: secret.metadata.labels["app.shipmight.com/id"],
    projectId: secret.metadata.labels["app.shipmight.com/project-id"],
    appChartId: secret.metadata.labels["app.shipmight.com/app-chart-id"],
    name: secret.metadata.annotations["app.shipmight.com/name"],
    values: JSON.parse(fromBase64(secret.data.values)),
  };
};

const getUuidFieldValue = (
  fields: components["schemas"]["AppChart"]["spec"]["fields"],
  values: { [key: string]: unknown }
): string | undefined => {
  const uuidField = fields.find((field) => field.useForUuid);
  if (!uuidField) {
    return undefined;
  }
  const uuidFieldValue = values[uuidField.id];
  if (typeof uuidFieldValue !== "string") {
    return undefined;
  }
  return uuidFieldValue;
};

export default class Apps {
  static async list(projectId: string, appChartId?: string): Promise<App[]> {
    let query = `app.shipmight.com/project-id=${projectId}`;
    if (appChartId) {
      query += `,app.shipmight.com/app-chart-id=${appChartId}`;
    }
    const secrets = await listSecrets(query);
    const apps = secrets.map((secret) => {
      return secretToApp(secret);
    });
    apps.sort((a, b) => a.name.localeCompare(b.name));
    return apps;
  }

  static async findIfExists(id: string): Promise<App> {
    const secrets = await listSecrets(`app.shipmight.com/id=${id}`);
    if (secrets.length !== 1) {
      return undefined;
    }
    const secret = secrets[0];
    const app = secretToApp(secret);
    return app;
  }

  static async find(id: string): Promise<App> {
    const app = await Apps.findIfExists(id);
    if (!app) {
      throw new Error(`app ${id} not found`);
    }
    return app;
  }

  static async create({
    projectId,
    appChartId,
    values: rawValues,
  }: Omit<App, "id" | "name">): Promise<App> {
    const appChart = await AppCharts.find(appChartId);
    const cards = appChart.spec.configurationCards;
    const fieldIds = cards.flatMap((card) => [...card]);
    const schema = schemaForSpecificValuesFields(appChart.schema, fieldIds);
    const values = valuesForSpecificFields(rawValues, fieldIds);
    jsonSchemaValidate(schema, values);
    const uuidFieldValue = getUuidFieldValue(appChart.spec.fields, values);
    const id = uuidFieldValue ? transformToId(uuidFieldValue) : getRandomId();
    const secret = appToSecret(
      {
        projectId,
        appChartId,
        id,
        values,
      },
      appChart.spec.fields
    );
    await createSecret(secret.metadata.namespace, secret);
    const app = await Apps.find(id);
    return app;
  }

  static async update(id: string, rawValues: App["values"]): Promise<App> {
    const app = await Apps.find(id);
    const appChart = await AppCharts.find(app.appChartId);

    const cards = appChart.spec.configurationCards;
    const fieldIds = cards.flatMap((card) => [...card]);
    const schema = schemaForSpecificValuesFields(appChart.schema, fieldIds);
    const values = valuesForSpecificFields(rawValues, fieldIds);
    const updatedApp = {
      ...app,
      values: {
        ...app.values,
        ...values,
      },
    };
    jsonSchemaValidate(schema, updatedApp.values);

    const secret = appToSecret(updatedApp, appChart.spec.fields);
    await replaceSecret(
      secret.metadata.namespace,
      secret.metadata.name,
      secret
    );
    const updated = await Apps.find(id);
    return updated;
  }

  static async delete(appId: string): Promise<void> {
    const app = await Apps.find(appId);
    const linkedDomains = await Domains.list(app.projectId, app.id);
    if (linkedDomains.length > 0) {
      log.error({
        message: "could not delete app because it is linked to a domain",
        linkedDomainIds: linkedDomains.map((domain) => domain.id),
      });
      throw new Error("app is linked to one or more domains, cannot delete");
    }
    // No need for actual fields, just using metadata here
    const fields = [];
    const secret = appToSecret(app, fields);
    await deleteSecret(secret.metadata.namespace, secret.metadata.name);
  }

  static async getGroupedPerLinkedResourceId(
    linkLabel: "linked-registry-id" | "linked-file-id",
    projectId?: string
  ): Promise<{ [linkedResourceId: string]: App[] }> {
    let query = "app.shipmight.com/id";
    if (projectId) {
      query += `,app.shipmight.com/project-id=${projectId}`;
    }
    const secrets = await listSecrets(query);
    const grouped: { [linkedResourceId: string]: App[] } = {};
    for (const secret of secrets) {
      const app = secretToApp(secret);
      const labelPrefix = `app.shipmight.com/${linkLabel}.`;
      for (const labelKey in secret.metadata.labels) {
        if (labelKey.startsWith(labelPrefix)) {
          const linkedResourceId = labelKey.slice(labelPrefix.length);
          grouped[linkedResourceId] = grouped[linkedResourceId] || [];
          grouped[linkedResourceId].push(app);
        }
      }
    }
    for (const linkedResourceId in grouped) {
      grouped[linkedResourceId].sort((a, b) => a.name.localeCompare(b.name));
    }
    return grouped;
  }

  static async listViaLink(
    linkLabel: "linked-registry-id" | "linked-file-id",
    linkedResourceId: string
  ): Promise<App[]> {
    const secrets = await listSecrets(
      `app.shipmight.com/${linkLabel}.${linkedResourceId}`
    );
    const apps = secrets.map((secret) => {
      return secretToApp(secret);
    });
    apps.sort((a, b) => a.name.localeCompare(b.name));
    return apps;
  }
}
