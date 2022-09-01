import { helmUninstall } from "../../../utils/helm";
import { getLogger } from "../../../utils/logging";
import { QueueTaskOfType } from "../../queue";

const log = getLogger("api:worker:uninstallApp");

export default async function uninstallApp(
  task: QueueTaskOfType<"uninstallApp">
): Promise<void> {
  log.info({
    message: "uninstalling app",
    appId: task.appId,
    requestId: task.requestId,
  });

  const namespace = task.projectId; // Part of task, because app Secret has already been deleted
  const releaseName = task.appId;

  log.info({
    message: "uninstalling helm chart",
    namespace,
    releaseName,
    requestId: task.requestId,
  });

  try {
    await helmUninstall({
      namespace,
      releaseName,
    });
  } catch (error) {
    if (error.message.includes("because release is not loaded")) {
      log.info({
        message: "helm uninstall failed because there was no release",
        requestId: task.requestId,
      });
    } else {
      log.error({
        message: "helm uninstall errored",
        error,
        requestId: task.requestId,
      });
      throw error;
    }
  }

  log.info({
    message: "app uninstalled",
    requestId: task.requestId,
  });
}
