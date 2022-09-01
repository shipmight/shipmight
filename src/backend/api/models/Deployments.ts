import { V1ReplicaSet, V1Pod } from "@kubernetes/client-node";
import { formatISO } from "date-fns";
import {
  listNamespacedPods,
  listNamespacedReplicaSets,
} from "../../utils/kubernetes";
import { components } from "../generated/apiSchema";
import Apps from "./Apps";

type Deployment = components["schemas"]["Deployment"];

const replicaSetToDeployment = (
  replicaSet: V1ReplicaSet,
  pods: V1Pod[]
): Deployment => {
  const getPodStatus = (pod: V1Pod): Deployment["podStatuses"][number] => {
    if (pod.status.phase === "Pending") {
      let message: string | undefined;

      const containerStatus = (pod.status.containerStatuses || [])[0];
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
      } else {
        const unschedulableCondition = pod.status.conditions.find(
          (condition) =>
            condition.type === "PodScheduled" &&
            condition.reason === "Unschedulable"
        );
        if (unschedulableCondition) {
          if (unschedulableCondition.message.includes("Insufficient memory")) {
            message =
              "Container cannot be created due to insufficient memory in cluster";
          } else if (
            unschedulableCondition.message.includes("Insufficient CPU")
          ) {
            message =
              "Container cannot be created due to insufficient CPU in cluster";
          } else {
            message = "Container cannot be created";
          }
        }
      }

      return {
        status: "PENDING",
        message,
      };
    }

    if (pod.status.phase === "Running") {
      let message: string | undefined;

      const containerStatus = pod.status.containerStatuses[0];
      if (containerStatus) {
        const terminatedState = containerStatus.state?.terminated;
        if (terminatedState) {
          if (
            terminatedState.reason === "Error" ||
            terminatedState.reason === "CrashLoopBackOff"
          ) {
            const retryText =
              containerStatus.restartCount > 0
                ? ` (retry ${containerStatus.restartCount})`
                : "";
            message = `Container exited with code ${terminatedState.exitCode}${retryText}, retrying`;
          }
        }

        const waitingState = containerStatus.state?.waiting;
        if (waitingState) {
          if (waitingState.reason === "CrashLoopBackOff") {
            message = "Restarting after failure";
          }
        }
      }

      if (message) {
        return {
          status: "ERRORED",
          message,
        };
      }
    }

    if (pod.status.phase === "Running") {
      return {
        status: "RUNNING",
      };
    }

    return {
      status: "UNKNOWN",
    };
  };

  const replicas = replicaSet.status?.replicas || 0;
  const readyReplicas = replicaSet.status?.readyReplicas || 0;

  const podTemplateHash = replicaSet.metadata.labels["pod-template-hash"];
  const deploymentPods = pods.filter(
    (pod) => pod.metadata.labels["pod-template-hash"] === podTemplateHash
  );
  deploymentPods.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));

  return {
    releaseId: replicaSet.metadata.labels["ext.shipmight.com/release-id"],
    createdAt: formatISO(replicaSet.metadata.creationTimestamp),
    replicas,
    readyReplicas,
    podStatuses: deploymentPods.map((pod) => getPodStatus(pod)),
  };
};

export default class Deployments {
  static async list(appId: string): Promise<Deployment[]> {
    const app = await Apps.find(appId);

    const [replicaSets, pods] = await Promise.all([
      listNamespacedReplicaSets(
        app.projectId,
        `ext.shipmight.com/app-id=${appId}`
      ),
      listNamespacedPods(app.projectId, `ext.shipmight.com/app-id=${appId}`),
    ]);

    const deployments = replicaSets.map((deployment) => {
      return replicaSetToDeployment(deployment, pods);
    });
    deployments.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    return deployments;
  }
}
