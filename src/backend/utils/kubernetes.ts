import {
  AppsV1Api,
  BatchV1Api,
  CoreV1Api,
  CustomObjectsApi,
  HttpError,
  KubeConfig,
  Metrics,
  NetworkingV1Api,
  PodStatus,
  topPods,
  V1Ingress,
  V1Job,
  V1Namespace,
  V1Pod,
  V1PodCondition,
  V1ReplicaSet,
  V1Secret,
  V1Service,
  V1Status,
  VersionApi,
  VersionInfo,
} from "@kubernetes/client-node";
import { IncomingMessage } from "http";
import request from "request";

// TS monstrosity incoming…
// @kubernetes/client-node returns an object with property body, even though it's typed as IncomingMessage
type IncomingMessageContainingStatusResponse = IncomingMessage & {
  body: V1Status;
};
const hasStatusResponse = (
  message: IncomingMessage
): message is IncomingMessageContainingStatusResponse => {
  const body = (message as unknown as { body: unknown }).body;
  if (typeof body !== "object") {
    return false;
  }
  const data = body as Record<string, unknown>;
  if (
    typeof data.kind !== "string" ||
    data.kind !== "Status" ||
    typeof data.apiVersion !== "string" ||
    data.apiVersion !== "v1"
  ) {
    return false;
  }
  return true;
};

export class KubernetesApiError extends Error {
  constructor(message: string, public status?: V1Status) {
    super(message);
    Object.setPrototypeOf(this, KubernetesApiError.prototype);
  }
}

function handleKubernetesApiError(error: HttpError): never {
  if (error instanceof HttpError && hasStatusResponse(error.response)) {
    throw new KubernetesApiError(
      `kubernetes API returned ${error.statusCode}, body: ${error.response.body.reason}`,
      error.response.body
    );
  }
  throw new Error(
    `kubernetes API returned ${error.statusCode}, error: ${error.message}`
  );
}

// APIs

function getRawRequest() {
  const kubeConfig = new KubeConfig();
  kubeConfig.loadFromDefault();
  const requestOptions: request.Options = { url: "" };
  kubeConfig.applyToRequest(requestOptions);
  const cluster = kubeConfig.getCurrentCluster();
  if (!cluster) {
    throw new Error(
      "@kubernetes/client-node did not find a cluster configuration"
    );
  }
  return request.defaults({
    ...requestOptions,
    baseUrl: cluster.server,
  });
}

const kubeConfig = new KubeConfig();
kubeConfig.loadFromDefault();

function getCoreV1Api() {
  return kubeConfig.makeApiClient(CoreV1Api);
}

function getVersionApi() {
  return kubeConfig.makeApiClient(VersionApi);
}

function getAppsV1Api() {
  return kubeConfig.makeApiClient(AppsV1Api);
}

function getBatchV1Api() {
  return kubeConfig.makeApiClient(BatchV1Api);
}

function getNetworkingV1Api() {
  return kubeConfig.makeApiClient(NetworkingV1Api);
}

function getCustomObjectsApi() {
  return kubeConfig.makeApiClient(CustomObjectsApi);
}

function getMetricsClient() {
  return new Metrics(kubeConfig);
}

// Health

export async function kubeReadyz(): Promise<void> {
  const rawRequest = getRawRequest();
  await new Promise<void>((resolve, reject) => {
    rawRequest("/readyz", (error) => {
      if (error) {
        return reject(error);
      }
      resolve();
    });
  });
}

// Version

export async function getKubeVersion(): Promise<VersionInfo> {
  const client = getVersionApi();
  const versionInfo = await client.getCode();
  return versionInfo.body;
}

// Metrics

export async function getPodsTop(namespace: string): Promise<PodStatus[]> {
  const client = getCoreV1Api();
  const metricsClient = getMetricsClient();
  const asd = await topPods(client, metricsClient, namespace);
  return asd;
}

// Namespaces

export async function createNamespace(
  namespace: V1Namespace
): Promise<V1Namespace> {
  const client = getCoreV1Api();
  const created = await client
    .createNamespace(namespace)
    .catch(handleKubernetesApiError);
  return created.body;
}

export async function listNamespaces(
  labelQuery: string
): Promise<V1Namespace[]> {
  const client = getCoreV1Api();
  const response = await client
    .listNamespace(undefined, undefined, undefined, undefined, labelQuery)
    .catch(handleKubernetesApiError);
  return response.body.items;
}

// Secrets

export async function createSecret(
  namespace: string,
  secret: V1Secret
): Promise<V1Secret> {
  const client = getCoreV1Api();
  const created = await client
    .createNamespacedSecret(namespace, secret)
    .catch(handleKubernetesApiError);
  return created.body;
}

export async function replaceSecret(
  namespace: string,
  name: string,
  secret: V1Secret
): Promise<V1Secret> {
  const client = getCoreV1Api();
  const replaced = await client
    .replaceNamespacedSecret(name, namespace, secret)
    .catch(handleKubernetesApiError);
  return replaced.body;
}

export async function getNamespacedSecret(
  namespace: string,
  name: string
): Promise<V1Secret> {
  const client = getCoreV1Api();
  const response = await client
    .readNamespacedSecret(name, namespace)
    .catch(handleKubernetesApiError);
  return response.body;
}

export async function getNamespacedSecretIfExists(
  namespace: string,
  name: string
): Promise<V1Secret | undefined> {
  try {
    const secret = await getNamespacedSecret(namespace, name);
    return secret;
  } catch (error) {
    if (
      error instanceof KubernetesApiError &&
      error.status.reason === "NotFound"
    ) {
      return undefined;
    }
    throw error;
  }
}

export async function listNamespacedSecrets(
  namespace: string,
  labelQuery: string
): Promise<V1Secret[]> {
  const client = getCoreV1Api();
  const response = await client
    .listNamespacedSecret(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelQuery
    )
    .catch(handleKubernetesApiError);
  return response.body.items;
}

export async function listSecrets(labelQuery: string): Promise<V1Secret[]> {
  const client = getCoreV1Api();
  const response = await client
    .listSecretForAllNamespaces(undefined, undefined, undefined, labelQuery)
    .catch(handleKubernetesApiError);
  return response.body.items;
}

export async function deleteSecret(
  namespace: string,
  name: V1Secret["metadata"]["name"]
): Promise<void> {
  const client = getCoreV1Api();
  await client
    .deleteNamespacedSecret(name, namespace)
    .catch(handleKubernetesApiError);
}

// Pods

export async function listNamespacedPods(
  namespace: string,
  labelQuery: string
): Promise<V1Pod[]> {
  const client = getCoreV1Api();
  const response = await client
    .listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelQuery
    )
    .catch(handleKubernetesApiError);
  return response.body.items;
}

export async function listPods(labelQuery: string): Promise<V1Pod[]> {
  const client = getCoreV1Api();
  const response = await client
    .listPodForAllNamespaces(undefined, undefined, undefined, labelQuery)
    .catch(handleKubernetesApiError);
  return response.body.items;
}

export function assertPodConditionsMatch(
  conditions: V1PodCondition[],
  expected: { [conditionType: string]: string }
): void {
  for (const conditionType in expected) {
    const actual = conditions.find(
      (condition) => condition.type === conditionType
    );
    if (!actual) {
      throw new Error(
        `expected condition ${conditionType} not present in actual conditions`
      );
    }
    if (actual.status !== expected[conditionType]) {
      throw new Error(
        `condition ${conditionType} status ${actual.status} does not match expected ${expected[conditionType]}`
      );
    }
  }
}

// ReplicaSets

export async function listNamespacedReplicaSets(
  namespace: string,
  labelQuery: string
): Promise<V1ReplicaSet[]> {
  const client = getAppsV1Api();
  const response = await client
    .listNamespacedReplicaSet(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelQuery
    )
    .catch(handleKubernetesApiError);
  return response.body.items;
}

// Jobs

export async function listNamespacedJobs(
  namespace: string,
  labelQuery: string
): Promise<V1Job[]> {
  const client = getBatchV1Api();
  const response = await client
    .listNamespacedJob(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelQuery
    )
    .catch(handleKubernetesApiError);
  return response.body.items;
}

export async function deleteNamespacedJob(
  namespace: string,
  name: string
): Promise<void> {
  const client = getBatchV1Api();
  await client
    .deleteNamespacedJob(name, namespace)
    .catch(handleKubernetesApiError);
}

// Ingresses

export async function createIngress(
  namespace: string,
  ingress: V1Ingress
): Promise<V1Ingress> {
  const client = getNetworkingV1Api();
  const response = await client
    .createNamespacedIngress(namespace, ingress)
    .catch(handleKubernetesApiError);
  return response.body;
}

export async function replaceIngress(
  namespace: string,
  name: string,
  ingress: V1Ingress
): Promise<V1Ingress> {
  const client = getNetworkingV1Api();
  const replaced = await client
    .replaceNamespacedIngress(name, namespace, ingress)
    .catch(handleKubernetesApiError);
  return replaced.body;
}

export async function listIngresses(labelQuery: string): Promise<V1Ingress[]> {
  const client = getNetworkingV1Api();
  const response = await client
    .listIngressForAllNamespaces(undefined, undefined, undefined, labelQuery)
    .catch(handleKubernetesApiError);
  return response.body.items;
}

export async function deleteIngress(
  namespace: string,
  name: V1Ingress["metadata"]["name"]
): Promise<void> {
  const client = getNetworkingV1Api();
  await client
    .deleteNamespacedIngress(name, namespace)
    .catch(handleKubernetesApiError);
}

// Services

export async function createService(
  namespace: string,
  service: V1Service
): Promise<V1Service> {
  const client = getCoreV1Api();
  const response = await client
    .createNamespacedService(namespace, service)
    .catch(handleKubernetesApiError);
  return response.body;
}

export async function patchService(
  namespace: string,
  name: string,
  service: V1Service,
  patchType: "strategic-merge-patch" | "merge-patch" = "merge-patch"
): Promise<V1Service> {
  const client = getCoreV1Api();
  const patched = await client
    .patchNamespacedService(
      name,
      namespace,
      service,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        headers: {
          "content-type": `application/${patchType}+json`,
        },
      }
    )
    .catch(handleKubernetesApiError);
  return patched.body;
}

export async function deleteService(
  namespace: string,
  name: V1Service["metadata"]["name"]
): Promise<void> {
  const client = getCoreV1Api();
  await client
    .deleteNamespacedService(name, namespace)
    .catch(handleKubernetesApiError);
}

// Certificates

// The raw CRD schema can be inspected via kubectl:
//   kubectl get crd certificates.cert-manager.io -o=jsonpath='{.spec.versions[0].schema.openAPIV3Schema}'
// Or found in the GitHub repository:
//   https://github.com/jetstack/cert-manager/blob/master/deploy/crds/crd-certificates.yaml
// We are only interested in a small subset… shall type it manually here
export type V1Certificate = {
  metadata: {
    name: string;
  };
  status: {
    conditions: {
      type: "Ready" | "Issuing";
      status: "True" | "False" | "Unknown";
    }[];
  };
};

export async function listNamespacedCertificates(
  namespace: string,
  labelQuery: string
): Promise<V1Certificate[]> {
  const client = getCustomObjectsApi();
  const response = await client
    .listNamespacedCustomObject(
      "cert-manager.io",
      "v1",
      namespace,
      "certificates",
      undefined,
      undefined,
      undefined,
      undefined,
      labelQuery
    )
    .catch(handleKubernetesApiError);
  const body = response.body as { items: V1Certificate[] };
  return body.items;
}

// ClusterIssuers

// The raw CRD schema can be inspected via kubectl:
//   kubectl get crd clusterissuers.cert-manager.io -o=jsonpath='{.spec.versions[0].schema.openAPIV3Schema}'
// Or found in the GitHub repository:
//   https://github.com/cert-manager/cert-manager/blob/master/deploy/crds/crd-clusterissuers.yaml
// We are only interested in a small subset… shall type it manually here
export type V1ClusterIssuer = {
  metadata: {
    name: string;
    labels: Record<string, string>;
    annotations: Record<string, string>;
  };
};

export async function listClusterIssuers(
  labelQuery: string
): Promise<V1ClusterIssuer[]> {
  const client = getCustomObjectsApi();
  const response = await client
    .listClusterCustomObject(
      "cert-manager.io",
      "v1",
      "clusterissuers",
      undefined,
      undefined,
      undefined,
      undefined,
      labelQuery
    )
    .catch(handleKubernetesApiError);
  const body = response.body as { items: V1ClusterIssuer[] };
  return body.items;
}
