import { V1Job, V1Pod } from "@kubernetes/client-node";
import { formatDuration, formatISO, intervalToDuration } from "date-fns";
import {
  deleteNamespacedJob,
  listNamespacedJobs,
  listNamespacedPods,
} from "../../utils/kubernetes";
import { components } from "../generated/apiSchema";
import Apps from "./Apps";

type Run = components["schemas"]["Run"];

const jobToRun = (job: V1Job, pods: V1Pod[]): Run => {
  const getJobStatus = (): Run["jobStatus"] => {
    const conditions = job.status.conditions || [];

    const failedCondition = conditions.find(
      (condition) => condition.type === "Failed"
    );
    if (failedCondition && failedCondition.status === "True") {
      let message: string | undefined;

      if (failedCondition.reason === "DeadlineExceeded") {
        const { activeDeadlineSeconds } = job.spec;
        const duration = intervalToDuration({
          start: 0,
          end: activeDeadlineSeconds * 1000,
        });
        message = `Did not finish within ${formatDuration(duration)}`;
      }

      return {
        status: "FAILED",
        message,
      };
    }

    if (job.status.active === 1) {
      let message: string | undefined;

      const pod = pods.find(
        (pod) =>
          pod.metadata.labels["ext.shipmight.com/release-id"] ===
          job.metadata.labels["ext.shipmight.com/release-id"]
      );
      const containerStatus = pod?.status?.containerStatuses[0];
      if (containerStatus) {
        const waitingState = containerStatus.state?.waiting;
        if (waitingState) {
          if (
            waitingState.reason === "ImagePullBackOff" ||
            waitingState.reason === "ErrImagePull"
          ) {
            message = `Pulling image ${containerStatus.image} failed, retrying`;
          }
          if (waitingState.reason === "ContainerCreating") {
            message = "Container creating";
          }
        }
      }

      if (typeof job.status.failed === "number") {
        if (message) {
          message += ` (failed ${job.status.failed} times, retrying)`;
        } else {
          message = `Failed ${job.status.failed} times, retrying`;
        }
      }

      return {
        status: "RUNNING",
        message,
      };
    }

    if (job.status.succeeded === 1) {
      let message: string | undefined;
      if (job.status.completionTime && job.status.startTime) {
        const duration = intervalToDuration({
          start: job.status.startTime,
          end: job.status.completionTime,
        });
        message = `Completed in ${formatDuration(duration)}`;
      }

      return {
        status: "SUCCEEDED",
        message,
      };
    }

    return {
      status: "UNKNOWN",
    };
  };

  return {
    releaseId: job.metadata.labels["ext.shipmight.com/release-id"],
    createdAt: formatISO(job.metadata.creationTimestamp),
    jobStatus: getJobStatus(),
  };
};

export default class Runs {
  static async list(appId: string): Promise<Run[]> {
    const app = await Apps.find(appId);

    const [jobs, pods] = await Promise.all([
      listNamespacedJobs(app.projectId, `ext.shipmight.com/app-id=${appId}`),
      listNamespacedPods(app.projectId, `ext.shipmight.com/app-id=${appId}`),
    ]);

    const releases = jobs.map((job) => {
      return jobToRun(job, pods);
    });
    releases.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    return releases;
  }

  static async delete(projectId: string, releaseId: string): Promise<void> {
    const jobs = await listNamespacedJobs(
      projectId,
      `ext.shipmight.com/release-id=${releaseId}`
    );
    if (jobs.length !== 1) {
      throw new Error(`job with release ID ${releaseId} does not exist`);
    }
    const job = jobs[0];
    await deleteNamespacedJob(job.metadata.namespace, job.metadata.name);
  }
}
