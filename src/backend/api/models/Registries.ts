import { V1Secret } from "@kubernetes/client-node";
import {
  createSecret,
  deleteSecret,
  KubernetesApiError,
  listNamespacedSecrets,
  listSecrets,
  replaceSecret,
} from "../../utils/kubernetes";
import { getLogger } from "../../utils/logging";
import { fromBase64, toBase64, transformToId } from "../../utils/string";
import { components } from "../generated/apiSchema";
import Apps from "./Apps";
import Projects from "./Projects";

const log = getLogger("api:models:Registries");

type Registry = components["schemas"]["Registry"];
type Dockerconfigjson = {
  auths: {
    [url: string]: {
      auth: string;
    };
  };
};

function registryToSecret({
  id,
  name,
  url,
  authToken,
}: Omit<Registry, "authMethod"> & { authToken: string }): V1Secret {
  const namespace = "shipmight";
  const kubeName = id;
  let authMethod: Registry["authMethod"] = "NONE";
  let dockerconfigjson: Dockerconfigjson = {
    // Empty object is ignored by Kubernetes
    auths: {},
  };
  if (authToken !== "") {
    authMethod = "TOKEN";
    dockerconfigjson = {
      auths: {
        [url]: {
          auth: authToken,
        },
      },
    };
  }
  return {
    type: "kubernetes.io/dockerconfigjson",
    metadata: {
      namespace,
      name: kubeName,
      labels: {
        "app.kubernetes.io/managed-by": "shipmight",
        "registry.shipmight.com/id": id,
      },
      annotations: {
        "registry.shipmight.com/name": name,
        "registry.shipmight.com/url": url,
        "registry.shipmight.com/auth-method": authMethod,
      },
    },
    data: {
      ".dockerconfigjson": toBase64(JSON.stringify(dockerconfigjson)),
    },
  };
}

function secretToRegistry(secret: V1Secret): Registry {
  return {
    id: secret.metadata.labels["registry.shipmight.com/id"],
    name: secret.metadata.annotations["registry.shipmight.com/name"],
    url: secret.metadata.annotations["registry.shipmight.com/url"],
    authMethod: secret.metadata.annotations[
      "registry.shipmight.com/auth-method"
    ] as Registry["authMethod"],
  };
}

export default class Registries {
  static async create({
    name,
    url,
    authToken,
  }: Pick<Registry, "name" | "url"> & {
    authToken: string;
  }): Promise<Registry> {
    const id = transformToId(name);
    const secret = registryToSecret({
      id,
      name,
      url,
      authToken,
    });
    await createSecret(secret.metadata.namespace, secret);
    const registry = await Registries.find(id);
    return registry;
  }

  static async list(): Promise<Registry[]> {
    const secrets = await listNamespacedSecrets(
      "shipmight",
      "registry.shipmight.com/id"
    );
    const registries = secrets.map((secret) => secretToRegistry(secret));
    registries.sort((a, b) => a.name.localeCompare(b.name));
    return registries;
  }

  static async findIfExists(registryId: string): Promise<Registry | undefined> {
    const secrets = await listNamespacedSecrets(
      "shipmight",
      `registry.shipmight.com/id=${registryId}`
    );
    if (secrets.length !== 1) {
      return undefined;
    }
    const secret = secrets[0];
    const registry = secretToRegistry(secret);
    return registry;
  }

  static async find(registryId: string): Promise<Registry> {
    const registry = await Registries.findIfExists(registryId);
    if (!registry) {
      throw new Error(`registry ${registryId} not found`);
    }
    return registry;
  }

  static async getAuthToken(registryId: string): Promise<string> {
    const secrets = await listNamespacedSecrets(
      "shipmight",
      `registry.shipmight.com/id=${registryId}`
    );
    if (secrets.length !== 1) {
      throw new Error(`registry ${registryId} not found`);
    }
    const secret = secrets[0];
    const registry = secretToRegistry(secret);
    const dockerconfigjson: Dockerconfigjson = JSON.parse(
      fromBase64(secret.data[".dockerconfigjson"])
    );
    const authToken = dockerconfigjson.auths[registry.url]
      ? dockerconfigjson.auths[registry.url].auth
      : "";
    return authToken;
  }

  static async update(
    registryId: string,
    data: Partial<Pick<Registry, "name" | "url">> & {
      authToken?: string;
    }
  ): Promise<Registry> {
    const registry = await Registries.find(registryId);

    const name = typeof data.name === "string" ? data.name : registry.name;
    const url = typeof data.url === "string" ? data.url : registry.url;
    const authToken =
      typeof data.authToken === "string"
        ? data.authToken
        : await Registries.getAuthToken(registryId);

    const secret = registryToSecret({
      id: registryId,
      name,
      url,
      authToken,
    });

    await replaceSecret(
      secret.metadata.namespace,
      secret.metadata.name,
      secret
    );

    await Registries.updateClones(registryId);

    const updated = await Registries.find(registryId);
    return updated;
  }

  static async delete(registryId: string): Promise<void> {
    const registry = await Registries.find(registryId);
    const linkedApps = await Apps.listViaLink("linked-registry-id", registryId);
    if (linkedApps.length > 0) {
      log.error({
        message: "could not delete registry because it is linked to an app",
        linkedAppIds: linkedApps.map((app) => app.id),
      });
      throw new Error("registry is linked to one or more apps, cannot delete");
    }
    await Registries.deleteClones(registryId);
    const secret = registryToSecret({
      ...registry,
      // Doesn't matter, we're just using metadata
      authToken: "",
    });
    await deleteSecret(secret.metadata.namespace, secret.metadata.name);
  }

  static async cloneToProject(
    registryId: string,
    projectId: string
  ): Promise<string> {
    await Registries.find(registryId);
    await Projects.find(projectId);

    const secrets = await listNamespacedSecrets(
      "shipmight",
      `registry.shipmight.com/id=${registryId}`
    );
    if (secrets.length !== 1) {
      throw new Error(`registry ${registryId} not found`);
    }
    const parentSecret = secrets[0];

    const clonedSecret: V1Secret = {
      type: "kubernetes.io/dockerconfigjson",
      metadata: {
        name: parentSecret.metadata.name,
        labels: {
          "app.kubernetes.io/managed-by": "shipmight",
          "registry.shipmight.com/clone-of": registryId,
        },
      },
      data: {
        ".dockerconfigjson": parentSecret.data[".dockerconfigjson"],
      },
    };

    try {
      await createSecret(projectId, clonedSecret);
    } catch (error) {
      if (
        error instanceof KubernetesApiError &&
        error.status.reason === "AlreadyExists"
      ) {
        await replaceSecret(
          projectId,
          clonedSecret.metadata.name,
          clonedSecret
        );
      } else {
        throw error;
      }
    }

    return clonedSecret.metadata.name;
  }

  static async updateClones(registryId: string): Promise<void> {
    const secrets = await listSecrets(
      `registry.shipmight.com/clone-of=${registryId}`
    );
    log.info({
      message: "updating registry clones",
      updateAmount: secrets.length,
      registryId,
    });
    await Promise.all(
      secrets.map(async (secret) => {
        const { namespace } = secret.metadata;
        try {
          // TODO this is a tad expensive, since each call does lots of resource reading
          await Registries.cloneToProject(registryId, namespace);
        } catch (error) {
          log.error({
            message: "updating clone registry errored",
            namespace,
            error,
          });
        }
      })
    );
  }

  static async deleteClones(registryId: string): Promise<void> {
    const secrets = await listSecrets(
      `registry.shipmight.com/clone-of=${registryId}`
    );
    log.info({
      message: "deleting registry clones",
      cloneAmount: secrets.length,
      registryId,
    });
    await Promise.all(
      secrets.map(async (secret) => {
        const { namespace, name } = secret.metadata;
        try {
          await deleteSecret(namespace, name);
        } catch (error) {
          log.error({
            message: "deleting clone registry errored",
            namespace,
            name,
            error,
          });
        }
      })
    );
  }
}
