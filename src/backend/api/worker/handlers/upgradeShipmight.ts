import { randomCharacters } from "../../../utils/crypto";
import env from "../../../utils/env";
import { helmRepoAdd, helmUpgrade } from "../../../utils/helm";
import { getLogger } from "../../../utils/logging";
import { QueueTaskOfType } from "../../queue";

const log = getLogger("api:worker:upgradeShipmight");

export default async function upgradeShipmight(
  task: QueueTaskOfType<"upgradeShipmight">
): Promise<void> {
  log.info({
    message: "upgrading shipmight",
    version: task.version,
  });

  const repository = env.selfUpdateRepository;

  const tmpDir = `/tmp/upgradeShipmight-${randomCharacters(16)}`;
  const helmEnv = {
    HELM_CACHE_HOME: `${tmpDir}/HELM_CACHE_HOME`,
    HELM_DATA_HOME: `${tmpDir}/HELM_DATA_HOME`,
    HELM_REGISTRY_CONFIG: `${tmpDir}/HELM_REGISTRY_CONFIG.json`,
    HELM_REPOSITORY_CACHE: `${tmpDir}/HELM_REPOSITORY_CACHE`,
    HELM_REPOSITORY_CONFIG: `${tmpDir}/HELM_REPOSITORY_CONFIG.yaml`,
  };

  log.info({
    message: "adding helm repo",
    helmEnv,
  });

  try {
    await helmRepoAdd("shipmight-repo", repository, {
      env: helmEnv,
    });
  } catch (error) {
    log.error({
      message: "adding helm repo errored",
      error,
    });
    throw error;
  }

  const namespace = env.releaseNamespace;
  const releaseName = env.releaseName;
  const chart = {
    installedChartName: `shipmight-repo/shipmight-stack`,
  };
  const values = {};
  const version = task.version;

  log.info({
    message: "upgrading shipmight release",
    namespace,
    releaseName,
    chart,
    version,
    helmEnv,
  });

  try {
    await helmUpgrade(
      {
        namespace,
        releaseName,
        chart,
        values,
        version,
      },
      {
        env: helmEnv,
      }
    );
  } catch (error) {
    log.error({
      message: "upgrading shipmight release errored",
      error,
    });
    throw error;
  }

  log.info({
    message: "shipmight upgraded",
  });
}
