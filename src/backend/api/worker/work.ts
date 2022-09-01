import { QueueTask } from "../queue";
import uninstallApp from "./handlers/uninstallApp";
import upgradeShipmight from "./handlers/upgradeShipmight";
import releaseApp from "./handlers/releaseApp";

const isQueueTask = (task: unknown): task is QueueTask => {
  if (typeof task === "object" && "taskType" in task) {
    return true;
  }
  return false;
};

export default async function work(task: unknown): Promise<void> {
  if (!isQueueTask(task)) {
    throw new Error("given task is not a valid task object");
  }

  switch (task.taskType) {
    case "upgradeShipmight": {
      await upgradeShipmight(task);
      break;
    }

    case "releaseApp": {
      await releaseApp(task);
      break;
    }

    case "uninstallApp": {
      await uninstallApp(task);
      break;
    }

    default: {
      const foobarTask: { taskType: string } = task;
      throw new Error(`unknown task type ${foobarTask.taskType}`);
    }
  }
}
