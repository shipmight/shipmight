import { V1Ingress, V1Service } from "@kubernetes/client-node";
import {
  createIngress,
  createService,
  deleteIngress,
  deleteService,
  listIngresses,
  replaceIngress,
  patchService,
} from "../../utils/kubernetes";
import { transformToId } from "../../utils/string";
import { getCertManagerIssuers } from "../services/certManager";
import { components } from "../generated/apiSchema";
import Apps from "./Apps";
import AppCharts from "./AppCharts";
import MasterDomains from "./MasterDomains";

type Domain = components["schemas"]["Domain"];
type AppChart = components["schemas"]["AppChart"];

function domainToKubeResources(
  {
    projectId,
    id,
    appId,
    hostname,
    path,
    appServiceTargetId,
    targetPort,
  }: Domain,
  appChart?: AppChart
): { ingress: V1Ingress; service: V1Service } {
  const namespace = projectId;
  const kubeName = id;

  let serviceSelector: Record<string, string> | undefined = undefined;
  if (appId && appChart) {
    const serviceTarget = appChart.spec.serviceTargets.find(
      (serviceTarget) => serviceTarget.id === appServiceTargetId
    );
    if (!serviceTarget) {
      throw new Error(`expected to find serviceTarget from app chart spec`);
    }
    serviceSelector = {
      [`ext.shipmight.com/service-target.${serviceTarget.id}`]: appId,
    };
  }

  const ingress: V1Ingress = {
    metadata: {
      namespace,
      name: kubeName,
      labels: {
        "app.kubernetes.io/managed-by": "shipmight",
        "domain.shipmight.com/id": id,
        "domain.shipmight.com/project-id": projectId,
        ...(appId ? { "domain.shipmight.com/app-id": appId } : {}),
      },
      annotations: {
        "domain.shipmight.com/hostname": hostname,
        "domain.shipmight.com/path": path,
        "domain.shipmight.com/app-service-target-id": appServiceTargetId || "",
        "domain.shipmight.com/target-port": targetPort.toString(),

        "kubernetes.io/ingress.class": "nginx",
        "nginx.org/mergeable-ingress-type": "minion",
      },
    },
    spec: {
      rules: [
        {
          host: hostname,
          http: serviceSelector
            ? {
                paths: [
                  {
                    pathType: "Prefix",
                    path,
                    backend: {
                      service: {
                        name: id,
                        port: {
                          number: targetPort,
                        },
                      },
                    },
                  },
                ],
              }
            : null,
        },
      ],
    },
  };

  const service: V1Service = {
    metadata: {
      namespace,
      name: kubeName,
      labels: {
        "app.kubernetes.io/managed-by": "shipmight",
        "domain.shipmight.com/id": id,
      },
    },
    spec: {
      selector: serviceSelector || null,
      ports: [
        {
          name: "http",
          protocol: "TCP",
          port: targetPort,
        },
      ],
    },
  };

  return { ingress, service };
}

function ingressToDomain(ingress: V1Ingress): Domain {
  return {
    id: ingress.metadata.labels["domain.shipmight.com/id"],
    projectId: ingress.metadata.labels["domain.shipmight.com/project-id"],
    appId: ingress.metadata.labels["domain.shipmight.com/app-id"],
    hostname: ingress.metadata.annotations["domain.shipmight.com/hostname"],
    path: ingress.metadata.annotations["domain.shipmight.com/path"],
    appServiceTargetId:
      ingress.metadata.annotations[
        "domain.shipmight.com/app-service-target-id"
      ] || null,
    targetPort: parseInt(
      ingress.metadata.annotations["domain.shipmight.com/target-port"]
    ),
  };
}

export default class Domains {
  static async list(projectId: string, appId?: string): Promise<Domain[]> {
    let query = `domain.shipmight.com/project-id=${projectId}`;
    if (appId) {
      query += `,domain.shipmight.com/app-id=${appId}`;
    }
    const ingresses = await listIngresses(query);
    const domains = ingresses.map((ingress) => ingressToDomain(ingress));
    domains.sort((a, b) => a.hostname.localeCompare(b.hostname));
    return domains;
  }

  static async listFromAllProjects(): Promise<Domain[]> {
    const ingresses = await listIngresses("domain.shipmight.com/project-id");
    const domains = ingresses.map((ingress) => ingressToDomain(ingress));
    domains.sort((a, b) => a.hostname.localeCompare(b.hostname));
    return domains;
  }

  static async findIfExists(id: string): Promise<Domain | undefined> {
    const ingresses = await listIngresses(`domain.shipmight.com/id=${id}`);
    if (ingresses.length !== 1) {
      return undefined;
    }
    const ingress = ingresses[0];
    const domain = ingressToDomain(ingress);
    return domain;
  }

  static async find(domainId: string): Promise<Domain> {
    const domain = await Domains.findIfExists(domainId);
    if (!domain) {
      throw new Error(`domain ${domainId} not found`);
    }
    return domain;
  }

  static async create(
    projectId: string,
    {
      hostname,
      path,
      appId,
      appServiceTargetId,
      targetPort,
    }: Omit<Domain, "id" | "projectId">
  ): Promise<Domain> {
    const certManagerIssuers = await getCertManagerIssuers();
    // In the future could come from browser, e.g. `enableSsl` or
    // `certManagerClusterIssuer`, after selection by user
    const certManagerClusterIssuer =
      certManagerIssuers.length === 1 ? certManagerIssuers[0].kubeName : null;

    let appChart: AppChart;
    if (appId) {
      const app = await Apps.find(appId);
      appChart = await AppCharts.find(app.appChartId);
    }

    await MasterDomains.createIfNotExists({
      hostname,
      certManagerClusterIssuer,
    });

    const id = transformToId(hostname);

    const { ingress, service } = domainToKubeResources(
      {
        projectId,
        id,
        appId,
        hostname,
        path,
        appServiceTargetId,
        targetPort,
      },
      appChart
    );
    await createIngress(ingress.metadata.namespace, ingress);
    try {
      await createService(service.metadata.namespace, service);
    } catch (error) {
      await deleteIngress(ingress.metadata.namespace, ingress.metadata.name);
      throw error;
    }

    const domain = await Domains.find(id);
    return domain;
  }

  static async delete(domainId: string): Promise<void> {
    const domain = await Domains.find(domainId);
    const { ingress, service } = domainToKubeResources(domain);
    await deleteService(service.metadata.namespace, service.metadata.name);
    await deleteIngress(ingress.metadata.namespace, ingress.metadata.name);
  }

  static async update(
    domainId: string,
    data: Pick<Domain, "path" | "appId" | "appServiceTargetId" | "targetPort">
  ): Promise<Domain> {
    const certManagerIssuers = await getCertManagerIssuers();
    // In the future could come from browser, e.g. `enableSsl` or
    // `certManagerClusterIssuer`, after selection by user
    const certManagerClusterIssuer =
      certManagerIssuers.length === 1 ? certManagerIssuers[0].kubeName : null;

    const domain = await Domains.find(domainId);
    const updatedDomain: Domain = {
      ...domain,
      ...data,
    };

    let appChart: AppChart;
    if (updatedDomain.appId) {
      const app = await Apps.find(updatedDomain.appId);
      appChart = await AppCharts.find(app.appChartId);
    }

    await MasterDomains.update({
      hostname: domain.hostname,
      certManagerClusterIssuer,
    });

    const { ingress, service } = domainToKubeResources(updatedDomain, appChart);
    await replaceIngress(
      ingress.metadata.namespace,
      ingress.metadata.name,
      ingress
    );
    await patchService(
      service.metadata.namespace,
      service.metadata.name,
      service
    );
    const updated = await Domains.find(domainId);
    return updated;
  }
}
