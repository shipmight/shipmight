import { V1Secret } from "@kubernetes/client-node";
import { formatISO } from "date-fns";
import { randomCharacters } from "../../utils/crypto";
import {
  createSecret,
  deleteSecret,
  listSecrets,
  replaceSecret,
} from "../../utils/kubernetes";
import { getLogger } from "../../utils/logging";
import { fromBase64, getRandomId, toBase64 } from "../../utils/string";
import { components } from "../generated/apiSchema";
import Apps from "./Apps";

const log = getLogger("api:models:DeployHooks");

type DeployHook = components["schemas"]["DeployHook"];

const deployHookToSecret = ({
  id,
  projectId,
  appId,
  name,
  token,
  lastUsedAt,
}: Omit<DeployHook, "createdAt" | "lastUsedAt"> & {
  lastUsedAt: Date | null;
}): V1Secret => {
  const namespace = projectId;
  const kubeName = id;

  return {
    metadata: {
      namespace,
      name: kubeName,
      labels: {
        "app.kubernetes.io/managed-by": "shipmight",
        "deploy-hook.shipmight.com/id": id,
        "deploy-hook.shipmight.com/project-id": projectId,
        "deploy-hook.shipmight.com/app-id": appId,
      },
      annotations: {
        "deploy-hook.shipmight.com/name": name,
        "deploy-hook.shipmight.com/last-used-at":
          lastUsedAt !== null ? formatISO(lastUsedAt) : "",
      },
    },
    data: {
      token: toBase64(token),
    },
  };
};

const secretToDeployHook = (secret: V1Secret): DeployHook => {
  return {
    id: secret.metadata.labels["deploy-hook.shipmight.com/id"],
    projectId: secret.metadata.labels["deploy-hook.shipmight.com/project-id"],
    appId: secret.metadata.labels["deploy-hook.shipmight.com/app-id"],
    name: secret.metadata.annotations["deploy-hook.shipmight.com/name"],
    lastUsedAt:
      secret.metadata.annotations["deploy-hook.shipmight.com/last-used-at"],
    createdAt: formatISO(secret.metadata.creationTimestamp),
  };
};

export default class DeployHooks {
  static async create({
    projectId,
    appId,
    name,
  }: Omit<
    DeployHook,
    "id" | "token" | "createdAt" | "lastUsedAt"
  >): Promise<DeployHook> {
    await Apps.find(appId);

    const id = getRandomId();
    const token = `${id}_${randomCharacters(64)}`;

    const secret = deployHookToSecret({
      projectId,
      id,
      appId,
      name,
      token,
      lastUsedAt: null,
    });
    await createSecret(secret.metadata.namespace, secret);

    const deployHook = await DeployHooks.find(id);
    return deployHook;
  }

  static async findIfExists(id: string): Promise<DeployHook> {
    const secrets = await listSecrets(`deploy-hook.shipmight.com/id=${id}`);
    if (secrets.length !== 1) {
      return undefined;
    }
    const secret = secrets[0];
    const deployHook = secretToDeployHook(secret);
    return deployHook;
  }

  static async find(id: string): Promise<DeployHook> {
    const deployHook = await DeployHooks.findIfExists(id);
    if (!deployHook) {
      throw new Error(`deploy hook ${id} not found`);
    }
    return deployHook;
  }

  static async list(appId: string): Promise<DeployHook[]> {
    await Apps.find(appId);
    const secrets = await listSecrets(
      `deploy-hook.shipmight.com/app-id=${appId}`
    );
    const deployHooks = secrets.map((secret) => secretToDeployHook(secret));
    deployHooks.sort((a, b) => a.name.localeCompare(b.name));
    return deployHooks;
  }

  static async getToken(deployHookId: string): Promise<string> {
    const secrets = await listSecrets(
      `deploy-hook.shipmight.com/id=${deployHookId}`
    );
    if (secrets.length !== 1) {
      throw new Error(`deploy hook ${deployHookId} not found`);
    }
    const secret = secrets[0];
    const token = fromBase64(secret.data["token"]);
    return token;
  }

  static async authenticateDeployHook(
    tokenFromUrl: string
  ): Promise<DeployHook | undefined> {
    const [id] = tokenFromUrl.split("_");
    let token: string;
    try {
      token = await DeployHooks.getToken(id);
    } catch (error) {
      return undefined;
    }
    if (tokenFromUrl !== token) {
      return undefined;
    }
    const secrets = await listSecrets(`deploy-hook.shipmight.com/id=${id}`);
    if (secrets.length !== 1) {
      return undefined;
    }
    const secret = secrets[0];
    const oldDeployHook = secretToDeployHook(secret);
    const newSecret = deployHookToSecret({
      ...oldDeployHook,
      token,
      lastUsedAt: new Date(),
    });
    await replaceSecret(
      newSecret.metadata.namespace,
      newSecret.metadata.name,
      newSecret
    );
    const deployHook = await DeployHooks.find(id);
    return deployHook;
  }

  static async delete(deployHookId: string): Promise<void> {
    const deployHook = await DeployHooks.find(deployHookId);
    const secret = deployHookToSecret({
      ...deployHook,
      // Does not matter, we only use namespace and name
      lastUsedAt: null,
      token: "",
    });
    await deleteSecret(secret.metadata.namespace, secret.metadata.name);
  }

  static async deleteForApp(appId: string): Promise<void> {
    const secrets = await listSecrets(
      `deploy-hook.shipmight.com/app-id=${appId}`
    );
    await Promise.all(
      secrets.map(async (secret) => {
        // TODO retry-logic perhaps?
        try {
          await deleteSecret(secret.metadata.namespace, secret.metadata.name);
        } catch (error) {
          log.error({
            message: "deleting deploy hook Secret failed",
            namespace: secret.metadata.namespace,
            name: secret.metadata.name,
            error,
          });
        }
      })
    );
  }
}
