import { getLogger } from "../utils/logging";

const log = getLogger("api:queue");

export type QueueTask = { requestId?: string } & (
  | {
      taskType: "upgradeShipmight";
      version: string;
    }
  | {
      taskType: "releaseApp";
      appId: string;
      releaseId: string;
      values: Record<string, unknown>;
    }
  | {
      taskType: "uninstallApp";
      projectId: string;
      appId: string;
    }
);

export type QueueTaskOfType<T extends QueueTask["taskType"]> = QueueTask & {
  taskType: T;
};

interface Queue {
  schedule: (
    task: QueueTask,
    options?: {
      delaySeconds?: 10 | 30;
      expireSeconds?: number;
    }
  ) => Promise<void>;

  consume: (onTask: (task: QueueTask) => Promise<void>) => Promise<void>;
}

class MemoryQueue implements Queue {
  private tasks: { task: QueueTask; expiresAfter: number | undefined }[] = [];

  private getUnixTimeSeconds(): number {
    return Math.floor(new Date().getTime() / 1000);
  }

  private getNextTask(): QueueTask | undefined {
    const item = this.tasks.shift();
    if (item === undefined) {
      return undefined;
    }
    const { task, expiresAfter } = item;
    if (expiresAfter < this.getUnixTimeSeconds()) {
      return this.getNextTask();
    }
    return task;
  }

  public schedule: Queue["schedule"] = async (task, options) => {
    const delaySeconds =
      typeof options !== "undefined" && typeof options.delaySeconds === "number"
        ? options.delaySeconds
        : 0;
    const expiresAfter =
      typeof options !== "undefined" &&
      typeof options.expireSeconds === "number"
        ? this.getUnixTimeSeconds() + options.expireSeconds
        : undefined;
    setTimeout(() => {
      this.tasks.push({ task, expiresAfter });
    }, delaySeconds);
  };

  public consume: Queue["consume"] = async (onTask) => {
    const consumeIfAny = async () => {
      const task = this.getNextTask();
      if (!task) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        try {
          await onTask(task);
        } catch (error) {
          log.error({
            message: "processing task errored",
            taskType: task.taskType,
            requestId: task.requestId,
            error,
          });
        }
      }
      await consumeIfAny();
    };

    await consumeIfAny();
  };
}

export default new MemoryQueue();
