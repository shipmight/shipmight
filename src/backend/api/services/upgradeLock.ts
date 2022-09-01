import { V1Secret } from "@kubernetes/client-node";
import env from "../../utils/env";
import { helmStatus } from "../../utils/helm";
import {
  createSecret,
  getNamespacedSecretIfExists,
  deleteSecret,
} from "../../utils/kubernetes";
import { getLogger } from "../../utils/logging";

const log = getLogger("api:services:upgradeLock");

const upgradeLockSecret: V1Secret = {
  metadata: {
    namespace: "shipmight",
    name: "upgrade-lock",
  },
};

export async function createUpgradeLock(): Promise<void> {
  await createSecret(upgradeLockSecret.metadata.namespace, upgradeLockSecret);
}

export async function readUpgradeLock(): Promise<
  Record<string, string> | undefined
> {
  const releaseStatus = await helmStatus({
    namespace: env.releaseNamespace,
    releaseName: env.releaseName,
  });

  if (releaseStatus !== "deployed") {
    log.info({
      message: "upgrade lock in effect based on helm release status",
      releaseStatus,
    });
    return {};
  }

  const existingSecret = await getNamespacedSecretIfExists(
    upgradeLockSecret.metadata.namespace,
    upgradeLockSecret.metadata.name
  );
  if (existingSecret) {
    log.info({
      message: "upgrade lock in effect based on existing secret",
      releaseStatus,
    });
    return {};
  }

  return undefined;
}

export async function releaseUpgradeLock(): Promise<void> {
  const existingSecret = await getNamespacedSecretIfExists(
    upgradeLockSecret.metadata.namespace,
    upgradeLockSecret.metadata.name
  );
  if (existingSecret) {
    log.info({
      message: "upgrade lock secret exists, deleting",
    });
    await deleteSecret(
      upgradeLockSecret.metadata.namespace,
      upgradeLockSecret.metadata.name
    );
  }
}
