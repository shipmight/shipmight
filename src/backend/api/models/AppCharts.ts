import { V1Secret } from "@kubernetes/client-node";
import { load } from "js-yaml";
import { readFilesFromChart } from "../../utils/helm";
import {
  createSecret,
  deleteSecret,
  listSecrets,
} from "../../utils/kubernetes";
import { fromBase64, toBase64 } from "../../utils/string";
import { components } from "../generated/apiSchema";

type AppChart = components["schemas"]["AppChart"];
type HelmChart = components["schemas"]["HelmChart"];

const parseSpec = (shipmightYaml: string): AppChart["spec"] => {
  try {
    const spec = load(shipmightYaml) as AppChart["spec"];
    return spec;
  } catch (error) {
    throw new Error("shipmight.yaml content could not be parsed as YAML");
  }
};

const parseSchema = (schemaJson: string): AppChart["schema"] => {
  try {
    const schema: AppChart["schema"] = JSON.parse(schemaJson);
    return schema;
  } catch (error) {
    throw new Error("values.schema.json content could not be parsed as JSON");
  }
};

const appChartToSecret = ({ id, chart, spec, schema }: AppChart): V1Secret => {
  const namespace = "shipmight";
  const kubeName = id;
  return {
    metadata: {
      namespace,
      name: kubeName,
      labels: {
        "app.kubernetes.io/managed-by": "shipmight",
        "app-chart.shipmight.com/id": id,
      },
    },
    data: {
      chart: toBase64(JSON.stringify(chart)),
      spec: toBase64(JSON.stringify(spec)),
      schema: toBase64(JSON.stringify(schema)),
    },
  };
};

const secretToAppChart = (secret: V1Secret): AppChart => {
  return {
    id: secret.metadata.labels["app-chart.shipmight.com/id"],
    chart: JSON.parse(fromBase64(secret.data.chart)),
    spec: JSON.parse(fromBase64(secret.data.spec)),
    schema: JSON.parse(fromBase64(secret.data.schema)),
  };
};

export default class AppCharts {
  static async list(): Promise<AppChart[]> {
    const secrets = await listSecrets("app-chart.shipmight.com/id");
    const appCharts = secrets.map((secret) => {
      return secretToAppChart(secret);
    });
    appCharts.sort((a, b) => a.id.localeCompare(b.id));
    return appCharts;
  }

  static async find(id: string): Promise<AppChart> {
    const secrets = await listSecrets(`app-chart.shipmight.com/id=${id}`);
    if (secrets.length !== 1) {
      throw new Error(`app chart ${id} not found`);
    }
    const secret = secrets[0];
    const appChart = secretToAppChart(secret);
    return appChart;
  }

  static async delete(appChartId: string): Promise<void> {
    const appChart = await AppCharts.find(appChartId);
    // TODO in the future might want to prevent if is linked to any app
    const secret = appChartToSecret(appChart);
    await deleteSecret(secret.metadata.namespace, secret.metadata.name);
  }

  static async create({
    id,
    chart,
  }: {
    id: string;
    chart: HelmChart;
  }): Promise<AppChart> {
    const [shipmightYaml, schemaJson] = await readFilesFromChart(chart, [
      "shipmight.yaml",
      "values.schema.json",
    ]);

    const spec = parseSpec(shipmightYaml);
    const schema = parseSchema(schemaJson);

    // TODO validate that spec is proper shipmight.yaml
    // TODO validate that values.name exists and expects string

    const secret = appChartToSecret({
      id,
      chart,
      spec,
      schema,
    });
    await createSecret(secret.metadata.namespace, secret);

    const appChart = await AppCharts.find(id);
    return appChart;
  }
}
