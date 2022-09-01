import { parseISO } from "date-fns";
import { mockApps } from "../testUtils/mockApps";
import { mockKubernetes } from "../testUtils/mockKubernetes";
import { nockHttp } from "../testUtils/nockHttp";
import { restoreAllMocks } from "../testUtils/restoreAllMocks";
import Deployments from "./Deployments";

restoreAllMocks();
nockHttp();
const kubernetes = mockKubernetes();
const Apps = mockApps();

describe("list", () => {
  beforeEach(() => {
    Apps.find.mockResolvedValue({
      id: "foobar-app-1",
      projectId: "foobar-project-1",
      appChartId: "foobar-app-chart-1",
      name: "App 1",
      values: {},
    });
  });

  it("returns empty list", async () => {
    kubernetes.listNamespacedReplicaSets.mockResolvedValueOnce([]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([]);

    const deployments = await Deployments.list("foobar-app-1");

    expect(kubernetes.listNamespacedReplicaSets).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespacedReplicaSets).toHaveBeenNthCalledWith(
      1,
      "foobar-project-1",
      "ext.shipmight.com/app-id=foobar-app-1"
    );
    expect(kubernetes.listNamespacedPods).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespacedPods).toHaveBeenNthCalledWith(
      1,
      "foobar-project-1",
      "ext.shipmight.com/app-id=foobar-app-1"
    );
    expect(deployments).toEqual([]);
  });

  it("returns newly created deployment", async () => {
    kubernetes.listNamespacedReplicaSets.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "deployment.kubernetes.io/desired-replicas": "2",
            "deployment.kubernetes.io/max-replicas": "3",
            "deployment.kubernetes.io/revision": "1",
            "meta.helm.sh/release-name": "nginx-71d2f",
            "meta.helm.sh/release-namespace": "default-project-5dafc",
          },
          creationTimestamp: parseISO("2022-08-29T16:57:48.000Z"),
          generation: 1,
          labels: {
            "ext.shipmight.com/app-id": "nginx-71d2f",
            "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
            "ext.shipmight.com/metrics-target.applicationPod": "nginx-71d2f",
            "ext.shipmight.com/release-id": "bd273",
            "ext.shipmight.com/service-target.applicationPod": "nginx-71d2f",
            "pod-template-hash": "5f66b4459",
          },
          name: "nginx-71d2f-5f66b4459",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "Deployment",
              name: "nginx-71d2f",
              uid: "9f6cb608-642a-4ed0-8243-02b9ae899261",
            },
          ],
          resourceVersion: "11774",
          uid: "f08cd9c5-4f66-400d-8825-1fa17d46bbe2",
        },
        spec: {
          replicas: 2,
          selector: {
            matchLabels: {
              "ext.shipmight.com/app-id": "nginx-71d2f",
              "pod-template-hash": "5f66b4459",
            },
          },
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "ext.shipmight.com/app-id": "nginx-71d2f",
                "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
                "ext.shipmight.com/metrics-target.applicationPod":
                  "nginx-71d2f",
                "ext.shipmight.com/release-id": "bd273",
                "ext.shipmight.com/service-target.applicationPod":
                  "nginx-71d2f",
                "pod-template-hash": "5f66b4459",
              },
            },
            spec: {
              automountServiceAccountToken: false,
              containers: [
                {
                  image: "docker.io/nginx:latest",
                  imagePullPolicy: "Always",
                  name: "nginx-71d2f",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
              dnsPolicy: "ClusterFirst",
              restartPolicy: "Always",
              schedulerName: "default-scheduler",
              securityContext: {},
              terminationGracePeriodSeconds: 30,
            },
          },
        },
        status: { fullyLabeledReplicas: 2, observedGeneration: 1, replicas: 2 },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-29T16:57:48.000Z"),
          generateName: "nginx-71d2f-5f66b4459-",
          labels: {
            "ext.shipmight.com/app-id": "nginx-71d2f",
            "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
            "ext.shipmight.com/metrics-target.applicationPod": "nginx-71d2f",
            "ext.shipmight.com/release-id": "bd273",
            "ext.shipmight.com/service-target.applicationPod": "nginx-71d2f",
            "pod-template-hash": "5f66b4459",
          },
          name: "nginx-71d2f-5f66b4459-28txb",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "ReplicaSet",
              name: "nginx-71d2f-5f66b4459",
              uid: "f08cd9c5-4f66-400d-8825-1fa17d46bbe2",
            },
          ],
          resourceVersion: "11778",
          uid: "9b36210e-8faa-4d68-aeba-54e83d78b69d",
        },
        spec: {
          automountServiceAccountToken: false,
          containers: [
            {
              image: "docker.io/nginx:latest",
              imagePullPolicy: "Always",
              name: "nginx-71d2f",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Always",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
          tolerations: [
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/not-ready",
              operator: "Exists",
              tolerationSeconds: 300,
            },
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/unreachable",
              operator: "Exists",
              tolerationSeconds: 300,
            },
          ],
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:48.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:48.000Z"),
              message: "containers with unready status: [nginx-71d2f]",
              reason: "ContainersNotReady",
              status: "False",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:48.000Z"),
              message: "containers with unready status: [nginx-71d2f]",
              reason: "ContainersNotReady",
              status: "False",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:48.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              image: "docker.io/nginx:latest",
              imageID: "",
              lastState: {},
              name: "nginx-71d2f",
              ready: false,
              restartCount: 0,
              started: false,
              state: { waiting: { reason: "ContainerCreating" } },
            },
          ],
          hostIP: "192.168.64.99",
          phase: "Pending",
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-29T16:57:48.000Z"),
        },
      },
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-29T16:57:48.000Z"),
          generateName: "nginx-71d2f-5f66b4459-",
          labels: {
            "ext.shipmight.com/app-id": "nginx-71d2f",
            "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
            "ext.shipmight.com/metrics-target.applicationPod": "nginx-71d2f",
            "ext.shipmight.com/release-id": "bd273",
            "ext.shipmight.com/service-target.applicationPod": "nginx-71d2f",
            "pod-template-hash": "5f66b4459",
          },
          name: "nginx-71d2f-5f66b4459-klbj7",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "ReplicaSet",
              name: "nginx-71d2f-5f66b4459",
              uid: "f08cd9c5-4f66-400d-8825-1fa17d46bbe2",
            },
          ],
          resourceVersion: "11777",
          uid: "d00bfd44-00b4-4d47-a355-1a0e4254af6a",
        },
        spec: {
          automountServiceAccountToken: false,
          containers: [
            {
              image: "docker.io/nginx:latest",
              imagePullPolicy: "Always",
              name: "nginx-71d2f",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Always",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
          tolerations: [
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/not-ready",
              operator: "Exists",
              tolerationSeconds: 300,
            },
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/unreachable",
              operator: "Exists",
              tolerationSeconds: 300,
            },
          ],
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:48.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:48.000Z"),
              message: "containers with unready status: [nginx-71d2f]",
              reason: "ContainersNotReady",
              status: "False",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:48.000Z"),
              message: "containers with unready status: [nginx-71d2f]",
              reason: "ContainersNotReady",
              status: "False",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:48.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              image: "docker.io/nginx:latest",
              imageID: "",
              lastState: {},
              name: "nginx-71d2f",
              ready: false,
              restartCount: 0,
              started: false,
              state: { waiting: { reason: "ContainerCreating" } },
            },
          ],
          hostIP: "192.168.64.99",
          phase: "Pending",
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-29T16:57:48.000Z"),
        },
      },
    ]);

    const deployments = await Deployments.list("foobar-app-1");

    expect(deployments).toEqual([
      {
        releaseId: "bd273",
        createdAt: "2022-08-29T16:57:48Z",
        replicas: 2,
        readyReplicas: 0,
        podStatuses: [
          { status: "PENDING", message: "Container creating" },
          { status: "PENDING", message: "Container creating" },
        ],
      },
    ]);
  });

  it("returns running deployment", async () => {
    kubernetes.listNamespacedReplicaSets.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "deployment.kubernetes.io/desired-replicas": "2",
            "deployment.kubernetes.io/max-replicas": "3",
            "deployment.kubernetes.io/revision": "1",
            "meta.helm.sh/release-name": "nginx-71d2f",
            "meta.helm.sh/release-namespace": "default-project-5dafc",
          },
          creationTimestamp: parseISO("2022-08-29T16:57:48.000Z"),
          generation: 1,
          labels: {
            "ext.shipmight.com/app-id": "nginx-71d2f",
            "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
            "ext.shipmight.com/metrics-target.applicationPod": "nginx-71d2f",
            "ext.shipmight.com/release-id": "bd273",
            "ext.shipmight.com/service-target.applicationPod": "nginx-71d2f",
            "pod-template-hash": "5f66b4459",
          },
          name: "nginx-71d2f-5f66b4459",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "Deployment",
              name: "nginx-71d2f",
              uid: "9f6cb608-642a-4ed0-8243-02b9ae899261",
            },
          ],
          resourceVersion: "11802",
          uid: "f08cd9c5-4f66-400d-8825-1fa17d46bbe2",
        },
        spec: {
          replicas: 2,
          selector: {
            matchLabels: {
              "ext.shipmight.com/app-id": "nginx-71d2f",
              "pod-template-hash": "5f66b4459",
            },
          },
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "ext.shipmight.com/app-id": "nginx-71d2f",
                "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
                "ext.shipmight.com/metrics-target.applicationPod":
                  "nginx-71d2f",
                "ext.shipmight.com/release-id": "bd273",
                "ext.shipmight.com/service-target.applicationPod":
                  "nginx-71d2f",
                "pod-template-hash": "5f66b4459",
              },
            },
            spec: {
              automountServiceAccountToken: false,
              containers: [
                {
                  image: "docker.io/nginx:latest",
                  imagePullPolicy: "Always",
                  name: "nginx-71d2f",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
              dnsPolicy: "ClusterFirst",
              restartPolicy: "Always",
              schedulerName: "default-scheduler",
              securityContext: {},
              terminationGracePeriodSeconds: 30,
            },
          },
        },
        status: {
          availableReplicas: 2,
          fullyLabeledReplicas: 2,
          observedGeneration: 1,
          readyReplicas: 2,
          replicas: 2,
        },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-29T16:57:48.000Z"),
          generateName: "nginx-71d2f-5f66b4459-",
          labels: {
            "ext.shipmight.com/app-id": "nginx-71d2f",
            "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
            "ext.shipmight.com/metrics-target.applicationPod": "nginx-71d2f",
            "ext.shipmight.com/release-id": "bd273",
            "ext.shipmight.com/service-target.applicationPod": "nginx-71d2f",
            "pod-template-hash": "5f66b4459",
          },
          name: "nginx-71d2f-5f66b4459-28txb",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "ReplicaSet",
              name: "nginx-71d2f-5f66b4459",
              uid: "f08cd9c5-4f66-400d-8825-1fa17d46bbe2",
            },
          ],
          resourceVersion: "11792",
          uid: "9b36210e-8faa-4d68-aeba-54e83d78b69d",
        },
        spec: {
          automountServiceAccountToken: false,
          containers: [
            {
              image: "docker.io/nginx:latest",
              imagePullPolicy: "Always",
              name: "nginx-71d2f",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Always",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
          tolerations: [
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/not-ready",
              operator: "Exists",
              tolerationSeconds: 300,
            },
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/unreachable",
              operator: "Exists",
              tolerationSeconds: 300,
            },
          ],
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:48.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:55.000Z"),
              status: "True",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:55.000Z"),
              status: "True",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:48.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              containerID:
                "docker://e21e72722beb697d9ded5294e33d52c56b610eb6ad3f4d34fd13868a42735e66",
              image: "nginx:latest",
              imageID:
                "docker-pullable://nginx@sha256:b95a99feebf7797479e0c5eb5ec0bdfa5d9f504bc94da550c2f58e839ea6914f",
              lastState: {},
              name: "nginx-71d2f",
              ready: true,
              restartCount: 0,
              started: true,
              state: {
                running: { startedAt: parseISO("2022-08-29T16:57:55.000Z") },
              },
            },
          ],
          hostIP: "192.168.64.99",
          phase: "Running",
          podIP: "172.17.0.14",
          podIPs: [{ ip: "172.17.0.14" }],
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-29T16:57:48.000Z"),
        },
      },
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-29T16:57:48.000Z"),
          generateName: "nginx-71d2f-5f66b4459-",
          labels: {
            "ext.shipmight.com/app-id": "nginx-71d2f",
            "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
            "ext.shipmight.com/metrics-target.applicationPod": "nginx-71d2f",
            "ext.shipmight.com/release-id": "bd273",
            "ext.shipmight.com/service-target.applicationPod": "nginx-71d2f",
            "pod-template-hash": "5f66b4459",
          },
          name: "nginx-71d2f-5f66b4459-klbj7",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "ReplicaSet",
              name: "nginx-71d2f-5f66b4459",
              uid: "f08cd9c5-4f66-400d-8825-1fa17d46bbe2",
            },
          ],
          resourceVersion: "11801",
          uid: "d00bfd44-00b4-4d47-a355-1a0e4254af6a",
        },
        spec: {
          automountServiceAccountToken: false,
          containers: [
            {
              image: "docker.io/nginx:latest",
              imagePullPolicy: "Always",
              name: "nginx-71d2f",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Always",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
          tolerations: [
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/not-ready",
              operator: "Exists",
              tolerationSeconds: 300,
            },
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/unreachable",
              operator: "Exists",
              tolerationSeconds: 300,
            },
          ],
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:48.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:58.000Z"),
              status: "True",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:58.000Z"),
              status: "True",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:48.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              containerID:
                "docker://6b569e36f11afd83eccd95a9ebb60fce1cab25c0266d9807a90337fc33d9010a",
              image: "nginx:latest",
              imageID:
                "docker-pullable://nginx@sha256:b95a99feebf7797479e0c5eb5ec0bdfa5d9f504bc94da550c2f58e839ea6914f",
              lastState: {},
              name: "nginx-71d2f",
              ready: true,
              restartCount: 0,
              started: true,
              state: {
                running: { startedAt: parseISO("2022-08-29T16:57:57.000Z") },
              },
            },
          ],
          hostIP: "192.168.64.99",
          phase: "Running",
          podIP: "172.17.0.13",
          podIPs: [{ ip: "172.17.0.13" }],
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-29T16:57:48.000Z"),
        },
      },
    ]);

    const deployments = await Deployments.list("foobar-app-1");

    expect(deployments).toEqual([
      {
        releaseId: "bd273",
        createdAt: "2022-08-29T16:57:48Z",
        replicas: 2,
        readyReplicas: 2,
        podStatuses: [{ status: "RUNNING" }, { status: "RUNNING" }],
      },
    ]);
  });

  it("returns updating deployment", async () => {
    kubernetes.listNamespacedReplicaSets.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "deployment.kubernetes.io/desired-replicas": "2",
            "deployment.kubernetes.io/max-replicas": "3",
            "deployment.kubernetes.io/revision": "1",
            "meta.helm.sh/release-name": "nginx-71d2f",
            "meta.helm.sh/release-namespace": "default-project-5dafc",
          },
          creationTimestamp: parseISO("2022-08-29T16:57:48.000Z"),
          generation: 2,
          labels: {
            "ext.shipmight.com/app-id": "nginx-71d2f",
            "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
            "ext.shipmight.com/metrics-target.applicationPod": "nginx-71d2f",
            "ext.shipmight.com/release-id": "bd273",
            "ext.shipmight.com/service-target.applicationPod": "nginx-71d2f",
            "pod-template-hash": "5f66b4459",
          },
          name: "nginx-71d2f-5f66b4459",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "Deployment",
              name: "nginx-71d2f",
              uid: "9f6cb608-642a-4ed0-8243-02b9ae899261",
            },
          ],
          resourceVersion: "12324",
          uid: "f08cd9c5-4f66-400d-8825-1fa17d46bbe2",
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              "ext.shipmight.com/app-id": "nginx-71d2f",
              "pod-template-hash": "5f66b4459",
            },
          },
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "ext.shipmight.com/app-id": "nginx-71d2f",
                "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
                "ext.shipmight.com/metrics-target.applicationPod":
                  "nginx-71d2f",
                "ext.shipmight.com/release-id": "bd273",
                "ext.shipmight.com/service-target.applicationPod":
                  "nginx-71d2f",
                "pod-template-hash": "5f66b4459",
              },
            },
            spec: {
              automountServiceAccountToken: false,
              containers: [
                {
                  image: "docker.io/nginx:latest",
                  imagePullPolicy: "Always",
                  name: "nginx-71d2f",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
              dnsPolicy: "ClusterFirst",
              restartPolicy: "Always",
              schedulerName: "default-scheduler",
              securityContext: {},
              terminationGracePeriodSeconds: 30,
            },
          },
        },
        status: {
          availableReplicas: 1,
          fullyLabeledReplicas: 1,
          observedGeneration: 2,
          readyReplicas: 1,
          replicas: 1,
        },
      },
      {
        metadata: {
          annotations: {
            "deployment.kubernetes.io/desired-replicas": "2",
            "deployment.kubernetes.io/max-replicas": "3",
            "deployment.kubernetes.io/revision": "2",
            "meta.helm.sh/release-name": "nginx-71d2f",
            "meta.helm.sh/release-namespace": "default-project-5dafc",
          },
          creationTimestamp: parseISO("2022-08-29T17:05:01.000Z"),
          generation: 2,
          labels: {
            "ext.shipmight.com/app-id": "nginx-71d2f",
            "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
            "ext.shipmight.com/metrics-target.applicationPod": "nginx-71d2f",
            "ext.shipmight.com/release-id": "36c1f",
            "ext.shipmight.com/service-target.applicationPod": "nginx-71d2f",
            "pod-template-hash": "d4dc9667b",
          },
          name: "nginx-71d2f-d4dc9667b",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "Deployment",
              name: "nginx-71d2f",
              uid: "9f6cb608-642a-4ed0-8243-02b9ae899261",
            },
          ],
          resourceVersion: "12322",
          uid: "da6c27f0-6099-4442-89e9-8c21349312f3",
        },
        spec: {
          replicas: 2,
          selector: {
            matchLabels: {
              "ext.shipmight.com/app-id": "nginx-71d2f",
              "pod-template-hash": "d4dc9667b",
            },
          },
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "ext.shipmight.com/app-id": "nginx-71d2f",
                "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
                "ext.shipmight.com/metrics-target.applicationPod":
                  "nginx-71d2f",
                "ext.shipmight.com/release-id": "36c1f",
                "ext.shipmight.com/service-target.applicationPod":
                  "nginx-71d2f",
                "pod-template-hash": "d4dc9667b",
              },
            },
            spec: {
              automountServiceAccountToken: false,
              containers: [
                {
                  image: "docker.io/nginx:latest",
                  imagePullPolicy: "Always",
                  name: "nginx-71d2f",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
              dnsPolicy: "ClusterFirst",
              restartPolicy: "Always",
              schedulerName: "default-scheduler",
              securityContext: {},
              terminationGracePeriodSeconds: 30,
            },
          },
        },
        status: {
          availableReplicas: 1,
          fullyLabeledReplicas: 2,
          observedGeneration: 2,
          readyReplicas: 1,
          replicas: 2,
        },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-29T16:57:48.000Z"),
          generateName: "nginx-71d2f-5f66b4459-",
          labels: {
            "ext.shipmight.com/app-id": "nginx-71d2f",
            "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
            "ext.shipmight.com/metrics-target.applicationPod": "nginx-71d2f",
            "ext.shipmight.com/release-id": "bd273",
            "ext.shipmight.com/service-target.applicationPod": "nginx-71d2f",
            "pod-template-hash": "5f66b4459",
          },
          name: "nginx-71d2f-5f66b4459-klbj7",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "ReplicaSet",
              name: "nginx-71d2f-5f66b4459",
              uid: "f08cd9c5-4f66-400d-8825-1fa17d46bbe2",
            },
          ],
          resourceVersion: "11801",
          uid: "d00bfd44-00b4-4d47-a355-1a0e4254af6a",
        },
        spec: {
          automountServiceAccountToken: false,
          containers: [
            {
              image: "docker.io/nginx:latest",
              imagePullPolicy: "Always",
              name: "nginx-71d2f",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Always",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
          tolerations: [
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/not-ready",
              operator: "Exists",
              tolerationSeconds: 300,
            },
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/unreachable",
              operator: "Exists",
              tolerationSeconds: 300,
            },
          ],
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:48.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:58.000Z"),
              status: "True",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:58.000Z"),
              status: "True",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T16:57:48.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              containerID:
                "docker://6b569e36f11afd83eccd95a9ebb60fce1cab25c0266d9807a90337fc33d9010a",
              image: "nginx:latest",
              imageID:
                "docker-pullable://nginx@sha256:b95a99feebf7797479e0c5eb5ec0bdfa5d9f504bc94da550c2f58e839ea6914f",
              lastState: {},
              name: "nginx-71d2f",
              ready: true,
              restartCount: 0,
              started: true,
              state: {
                running: { startedAt: parseISO("2022-08-29T16:57:57.000Z") },
              },
            },
          ],
          hostIP: "192.168.64.99",
          phase: "Running",
          podIP: "172.17.0.13",
          podIPs: [{ ip: "172.17.0.13" }],
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-29T16:57:48.000Z"),
        },
      },
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-29T17:05:10.000Z"),
          generateName: "nginx-71d2f-d4dc9667b-",
          labels: {
            "ext.shipmight.com/app-id": "nginx-71d2f",
            "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
            "ext.shipmight.com/metrics-target.applicationPod": "nginx-71d2f",
            "ext.shipmight.com/release-id": "36c1f",
            "ext.shipmight.com/service-target.applicationPod": "nginx-71d2f",
            "pod-template-hash": "d4dc9667b",
          },
          name: "nginx-71d2f-d4dc9667b-p27mj",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "ReplicaSet",
              name: "nginx-71d2f-d4dc9667b",
              uid: "da6c27f0-6099-4442-89e9-8c21349312f3",
            },
          ],
          resourceVersion: "12325",
          uid: "6f03dab5-7769-4065-bd05-c8a6dc1e20b2",
        },
        spec: {
          automountServiceAccountToken: false,
          containers: [
            {
              image: "docker.io/nginx:latest",
              imagePullPolicy: "Always",
              name: "nginx-71d2f",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Always",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
          tolerations: [
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/not-ready",
              operator: "Exists",
              tolerationSeconds: 300,
            },
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/unreachable",
              operator: "Exists",
              tolerationSeconds: 300,
            },
          ],
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:10.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:10.000Z"),
              message: "containers with unready status: [nginx-71d2f]",
              reason: "ContainersNotReady",
              status: "False",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:10.000Z"),
              message: "containers with unready status: [nginx-71d2f]",
              reason: "ContainersNotReady",
              status: "False",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:10.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              image: "docker.io/nginx:latest",
              imageID: "",
              lastState: {},
              name: "nginx-71d2f",
              ready: false,
              restartCount: 0,
              started: false,
              state: { waiting: { reason: "ContainerCreating" } },
            },
          ],
          hostIP: "192.168.64.99",
          phase: "Pending",
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-29T17:05:10.000Z"),
        },
      },
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-29T17:05:01.000Z"),
          generateName: "nginx-71d2f-d4dc9667b-",
          labels: {
            "ext.shipmight.com/app-id": "nginx-71d2f",
            "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
            "ext.shipmight.com/metrics-target.applicationPod": "nginx-71d2f",
            "ext.shipmight.com/release-id": "36c1f",
            "ext.shipmight.com/service-target.applicationPod": "nginx-71d2f",
            "pod-template-hash": "d4dc9667b",
          },
          name: "nginx-71d2f-d4dc9667b-qrrhr",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "ReplicaSet",
              name: "nginx-71d2f-d4dc9667b",
              uid: "da6c27f0-6099-4442-89e9-8c21349312f3",
            },
          ],
          resourceVersion: "12306",
          uid: "a633c37a-07ef-46c2-b0e6-7b737df3dcc6",
        },
        spec: {
          automountServiceAccountToken: false,
          containers: [
            {
              image: "docker.io/nginx:latest",
              imagePullPolicy: "Always",
              name: "nginx-71d2f",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Always",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
          tolerations: [
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/not-ready",
              operator: "Exists",
              tolerationSeconds: 300,
            },
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/unreachable",
              operator: "Exists",
              tolerationSeconds: 300,
            },
          ],
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:01.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:10.000Z"),
              status: "True",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:10.000Z"),
              status: "True",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:01.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              containerID:
                "docker://40bf6c1c92c21bb4b2006549d0cca233b47a3d4a5c36143bc80c799300ebbca6",
              image: "nginx:latest",
              imageID:
                "docker-pullable://nginx@sha256:b95a99feebf7797479e0c5eb5ec0bdfa5d9f504bc94da550c2f58e839ea6914f",
              lastState: {},
              name: "nginx-71d2f",
              ready: true,
              restartCount: 0,
              started: true,
              state: {
                running: { startedAt: parseISO("2022-08-29T17:05:09.000Z") },
              },
            },
          ],
          hostIP: "192.168.64.99",
          phase: "Running",
          podIP: "172.17.0.15",
          podIPs: [{ ip: "172.17.0.15" }],
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-29T17:05:01.000Z"),
        },
      },
    ]);

    const deployments = await Deployments.list("foobar-app-1");

    expect(deployments).toEqual([
      {
        releaseId: "36c1f",
        createdAt: "2022-08-29T17:05:01Z",
        replicas: 2,
        readyReplicas: 1,
        podStatuses: [
          { status: "PENDING", message: "Container creating" },
          { status: "RUNNING" },
        ],
      },
      {
        releaseId: "bd273",
        createdAt: "2022-08-29T16:57:48Z",
        replicas: 1,
        readyReplicas: 1,
        podStatuses: [{ status: "RUNNING" }],
      },
    ]);
  });

  it("returns running deployment and previous deployment", async () => {
    kubernetes.listNamespacedReplicaSets.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "deployment.kubernetes.io/desired-replicas": "2",
            "deployment.kubernetes.io/max-replicas": "3",
            "deployment.kubernetes.io/revision": "1",
            "meta.helm.sh/release-name": "nginx-71d2f",
            "meta.helm.sh/release-namespace": "default-project-5dafc",
          },
          creationTimestamp: parseISO("2022-08-29T16:57:48.000Z"),
          generation: 3,
          labels: {
            "ext.shipmight.com/app-id": "nginx-71d2f",
            "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
            "ext.shipmight.com/metrics-target.applicationPod": "nginx-71d2f",
            "ext.shipmight.com/release-id": "bd273",
            "ext.shipmight.com/service-target.applicationPod": "nginx-71d2f",
            "pod-template-hash": "5f66b4459",
          },
          name: "nginx-71d2f-5f66b4459",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "Deployment",
              name: "nginx-71d2f",
              uid: "9f6cb608-642a-4ed0-8243-02b9ae899261",
            },
          ],
          resourceVersion: "12353",
          uid: "f08cd9c5-4f66-400d-8825-1fa17d46bbe2",
        },
        spec: {
          replicas: 0,
          selector: {
            matchLabels: {
              "ext.shipmight.com/app-id": "nginx-71d2f",
              "pod-template-hash": "5f66b4459",
            },
          },
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "ext.shipmight.com/app-id": "nginx-71d2f",
                "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
                "ext.shipmight.com/metrics-target.applicationPod":
                  "nginx-71d2f",
                "ext.shipmight.com/release-id": "bd273",
                "ext.shipmight.com/service-target.applicationPod":
                  "nginx-71d2f",
                "pod-template-hash": "5f66b4459",
              },
            },
            spec: {
              automountServiceAccountToken: false,
              containers: [
                {
                  image: "docker.io/nginx:latest",
                  imagePullPolicy: "Always",
                  name: "nginx-71d2f",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
              dnsPolicy: "ClusterFirst",
              restartPolicy: "Always",
              schedulerName: "default-scheduler",
              securityContext: {},
              terminationGracePeriodSeconds: 30,
            },
          },
        },
        status: { observedGeneration: 3, replicas: 0 },
      },
      {
        metadata: {
          annotations: {
            "deployment.kubernetes.io/desired-replicas": "2",
            "deployment.kubernetes.io/max-replicas": "3",
            "deployment.kubernetes.io/revision": "2",
            "meta.helm.sh/release-name": "nginx-71d2f",
            "meta.helm.sh/release-namespace": "default-project-5dafc",
          },
          creationTimestamp: parseISO("2022-08-29T17:05:01.000Z"),
          generation: 2,
          labels: {
            "ext.shipmight.com/app-id": "nginx-71d2f",
            "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
            "ext.shipmight.com/metrics-target.applicationPod": "nginx-71d2f",
            "ext.shipmight.com/release-id": "36c1f",
            "ext.shipmight.com/service-target.applicationPod": "nginx-71d2f",
            "pod-template-hash": "d4dc9667b",
          },
          name: "nginx-71d2f-d4dc9667b",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "Deployment",
              name: "nginx-71d2f",
              uid: "9f6cb608-642a-4ed0-8243-02b9ae899261",
            },
          ],
          resourceVersion: "12345",
          uid: "da6c27f0-6099-4442-89e9-8c21349312f3",
        },
        spec: {
          replicas: 2,
          selector: {
            matchLabels: {
              "ext.shipmight.com/app-id": "nginx-71d2f",
              "pod-template-hash": "d4dc9667b",
            },
          },
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "ext.shipmight.com/app-id": "nginx-71d2f",
                "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
                "ext.shipmight.com/metrics-target.applicationPod":
                  "nginx-71d2f",
                "ext.shipmight.com/release-id": "36c1f",
                "ext.shipmight.com/service-target.applicationPod":
                  "nginx-71d2f",
                "pod-template-hash": "d4dc9667b",
              },
            },
            spec: {
              automountServiceAccountToken: false,
              containers: [
                {
                  image: "docker.io/nginx:latest",
                  imagePullPolicy: "Always",
                  name: "nginx-71d2f",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
              dnsPolicy: "ClusterFirst",
              restartPolicy: "Always",
              schedulerName: "default-scheduler",
              securityContext: {},
              terminationGracePeriodSeconds: 30,
            },
          },
        },
        status: {
          availableReplicas: 2,
          fullyLabeledReplicas: 2,
          observedGeneration: 2,
          readyReplicas: 2,
          replicas: 2,
        },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-29T17:05:10.000Z"),
          generateName: "nginx-71d2f-d4dc9667b-",
          labels: {
            "ext.shipmight.com/app-id": "nginx-71d2f",
            "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
            "ext.shipmight.com/metrics-target.applicationPod": "nginx-71d2f",
            "ext.shipmight.com/release-id": "36c1f",
            "ext.shipmight.com/service-target.applicationPod": "nginx-71d2f",
            "pod-template-hash": "d4dc9667b",
          },
          name: "nginx-71d2f-d4dc9667b-p27mj",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "ReplicaSet",
              name: "nginx-71d2f-d4dc9667b",
              uid: "da6c27f0-6099-4442-89e9-8c21349312f3",
            },
          ],
          resourceVersion: "12344",
          uid: "6f03dab5-7769-4065-bd05-c8a6dc1e20b2",
        },
        spec: {
          automountServiceAccountToken: false,
          containers: [
            {
              image: "docker.io/nginx:latest",
              imagePullPolicy: "Always",
              name: "nginx-71d2f",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Always",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
          tolerations: [
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/not-ready",
              operator: "Exists",
              tolerationSeconds: 300,
            },
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/unreachable",
              operator: "Exists",
              tolerationSeconds: 300,
            },
          ],
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:10.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:18.000Z"),
              status: "True",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:18.000Z"),
              status: "True",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:10.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              containerID:
                "docker://3420b5aee597d7628b2cc803efec204b92ce8bbba486d8a25f3049017acf2df2",
              image: "nginx:latest",
              imageID:
                "docker-pullable://nginx@sha256:b95a99feebf7797479e0c5eb5ec0bdfa5d9f504bc94da550c2f58e839ea6914f",
              lastState: {},
              name: "nginx-71d2f",
              ready: true,
              restartCount: 0,
              started: true,
              state: {
                running: { startedAt: parseISO("2022-08-29T17:05:17.000Z") },
              },
            },
          ],
          hostIP: "192.168.64.99",
          phase: "Running",
          podIP: "172.17.0.16",
          podIPs: [{ ip: "172.17.0.16" }],
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-29T17:05:10.000Z"),
        },
      },
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-29T17:05:01.000Z"),
          generateName: "nginx-71d2f-d4dc9667b-",
          labels: {
            "ext.shipmight.com/app-id": "nginx-71d2f",
            "ext.shipmight.com/log-target.applicationLogs": "nginx-71d2f",
            "ext.shipmight.com/metrics-target.applicationPod": "nginx-71d2f",
            "ext.shipmight.com/release-id": "36c1f",
            "ext.shipmight.com/service-target.applicationPod": "nginx-71d2f",
            "pod-template-hash": "d4dc9667b",
          },
          name: "nginx-71d2f-d4dc9667b-qrrhr",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "ReplicaSet",
              name: "nginx-71d2f-d4dc9667b",
              uid: "da6c27f0-6099-4442-89e9-8c21349312f3",
            },
          ],
          resourceVersion: "12306",
          uid: "a633c37a-07ef-46c2-b0e6-7b737df3dcc6",
        },
        spec: {
          automountServiceAccountToken: false,
          containers: [
            {
              image: "docker.io/nginx:latest",
              imagePullPolicy: "Always",
              name: "nginx-71d2f",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Always",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
          tolerations: [
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/not-ready",
              operator: "Exists",
              tolerationSeconds: 300,
            },
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/unreachable",
              operator: "Exists",
              tolerationSeconds: 300,
            },
          ],
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:01.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:10.000Z"),
              status: "True",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:10.000Z"),
              status: "True",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:05:01.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              containerID:
                "docker://40bf6c1c92c21bb4b2006549d0cca233b47a3d4a5c36143bc80c799300ebbca6",
              image: "nginx:latest",
              imageID:
                "docker-pullable://nginx@sha256:b95a99feebf7797479e0c5eb5ec0bdfa5d9f504bc94da550c2f58e839ea6914f",
              lastState: {},
              name: "nginx-71d2f",
              ready: true,
              restartCount: 0,
              started: true,
              state: {
                running: { startedAt: parseISO("2022-08-29T17:05:09.000Z") },
              },
            },
          ],
          hostIP: "192.168.64.99",
          phase: "Running",
          podIP: "172.17.0.15",
          podIPs: [{ ip: "172.17.0.15" }],
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-29T17:05:01.000Z"),
        },
      },
    ]);

    const deployments = await Deployments.list("foobar-app-1");

    expect(deployments).toEqual([
      {
        releaseId: "36c1f",
        createdAt: "2022-08-29T17:05:01Z",
        replicas: 2,
        readyReplicas: 2,
        podStatuses: [{ status: "RUNNING" }, { status: "RUNNING" }],
      },
      {
        releaseId: "bd273",
        createdAt: "2022-08-29T16:57:48Z",
        replicas: 0,
        readyReplicas: 0,
        podStatuses: [],
      },
    ]);
  });

  it("returns deployment with all replicas in ErrImagePull", async () => {
    kubernetes.listNamespacedReplicaSets.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "deployment.kubernetes.io/desired-replicas": "1",
            "deployment.kubernetes.io/max-replicas": "2",
            "deployment.kubernetes.io/revision": "1",
            "meta.helm.sh/release-name": "fail-image-426a5",
            "meta.helm.sh/release-namespace": "default-project-5dafc",
          },
          creationTimestamp: parseISO("2022-08-29T17:35:23.000Z"),
          generation: 1,
          labels: {
            "ext.shipmight.com/app-id": "fail-image-426a5",
            "ext.shipmight.com/log-target.applicationLogs": "fail-image-426a5",
            "ext.shipmight.com/metrics-target.applicationPod":
              "fail-image-426a5",
            "ext.shipmight.com/release-id": "f25dc",
            "ext.shipmight.com/service-target.applicationPod":
              "fail-image-426a5",
            "pod-template-hash": "cccd6c467",
          },
          name: "fail-image-426a5-cccd6c467",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "Deployment",
              name: "fail-image-426a5",
              uid: "be7d30ee-1ae9-4fcb-bf04-8153cf70fed9",
            },
          ],
          resourceVersion: "14432",
          uid: "8fa8fdfe-6c2e-49b6-bf28-f078e84ad0a0",
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              "ext.shipmight.com/app-id": "fail-image-426a5",
              "pod-template-hash": "cccd6c467",
            },
          },
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "ext.shipmight.com/app-id": "fail-image-426a5",
                "ext.shipmight.com/log-target.applicationLogs":
                  "fail-image-426a5",
                "ext.shipmight.com/metrics-target.applicationPod":
                  "fail-image-426a5",
                "ext.shipmight.com/release-id": "f25dc",
                "ext.shipmight.com/service-target.applicationPod":
                  "fail-image-426a5",
                "pod-template-hash": "cccd6c467",
              },
            },
            spec: {
              automountServiceAccountToken: false,
              containers: [
                {
                  image: "docker.io/ajhvjhsdfjhahgdf:latest",
                  imagePullPolicy: "Always",
                  name: "fail-image-426a5",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
              dnsPolicy: "ClusterFirst",
              restartPolicy: "Always",
              schedulerName: "default-scheduler",
              securityContext: {},
              terminationGracePeriodSeconds: 30,
            },
          },
        },
        status: { fullyLabeledReplicas: 1, observedGeneration: 1, replicas: 1 },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-29T17:35:24.000Z"),
          generateName: "fail-image-426a5-cccd6c467-",
          labels: {
            "ext.shipmight.com/app-id": "fail-image-426a5",
            "ext.shipmight.com/log-target.applicationLogs": "fail-image-426a5",
            "ext.shipmight.com/metrics-target.applicationPod":
              "fail-image-426a5",
            "ext.shipmight.com/release-id": "f25dc",
            "ext.shipmight.com/service-target.applicationPod":
              "fail-image-426a5",
            "pod-template-hash": "cccd6c467",
          },
          name: "fail-image-426a5-cccd6c467-pz4h8",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "ReplicaSet",
              name: "fail-image-426a5-cccd6c467",
              uid: "8fa8fdfe-6c2e-49b6-bf28-f078e84ad0a0",
            },
          ],
          resourceVersion: "14446",
          uid: "ed881c2a-92d6-49e4-93c8-9947a65bc57a",
        },
        spec: {
          automountServiceAccountToken: false,
          containers: [
            {
              image: "docker.io/ajhvjhsdfjhahgdf:latest",
              imagePullPolicy: "Always",
              name: "fail-image-426a5",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Always",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
          tolerations: [
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/not-ready",
              operator: "Exists",
              tolerationSeconds: 300,
            },
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/unreachable",
              operator: "Exists",
              tolerationSeconds: 300,
            },
          ],
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:35:24.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:35:24.000Z"),
              message: "containers with unready status: [fail-image-426a5]",
              reason: "ContainersNotReady",
              status: "False",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:35:24.000Z"),
              message: "containers with unready status: [fail-image-426a5]",
              reason: "ContainersNotReady",
              status: "False",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:35:24.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              image: "docker.io/ajhvjhsdfjhahgdf:latest",
              imageID: "",
              lastState: {},
              name: "fail-image-426a5",
              ready: false,
              restartCount: 0,
              started: false,
              state: {
                waiting: {
                  message:
                    "rpc error: code = Unknown desc = Error response from daemon: pull access denied for ajhvjhsdfjhahgdf, repository does not exist or may require 'docker login': denied: requested access to the resource is denied",
                  reason: "ErrImagePull",
                },
              },
            },
          ],
          hostIP: "192.168.64.99",
          phase: "Pending",
          podIP: "172.17.0.13",
          podIPs: [{ ip: "172.17.0.13" }],
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-29T17:35:24.000Z"),
        },
      },
    ]);

    const deployments = await Deployments.list("foobar-app-1");

    expect(deployments).toEqual([
      {
        releaseId: "f25dc",
        createdAt: "2022-08-29T17:35:23Z",
        replicas: 1,
        readyReplicas: 0,
        podStatuses: [
          {
            status: "PENDING",
            message:
              "Pulling image docker.io/ajhvjhsdfjhahgdf:latest failed, retrying",
          },
        ],
      },
    ]);
  });

  it("returns deployment with all replicas in ImagePullBackOff", async () => {
    kubernetes.listNamespacedReplicaSets.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "deployment.kubernetes.io/desired-replicas": "1",
            "deployment.kubernetes.io/max-replicas": "2",
            "deployment.kubernetes.io/revision": "1",
            "meta.helm.sh/release-name": "fail-image-426a5",
            "meta.helm.sh/release-namespace": "default-project-5dafc",
          },
          creationTimestamp: parseISO("2022-08-29T17:35:23.000Z"),
          generation: 1,
          labels: {
            "ext.shipmight.com/app-id": "fail-image-426a5",
            "ext.shipmight.com/log-target.applicationLogs": "fail-image-426a5",
            "ext.shipmight.com/metrics-target.applicationPod":
              "fail-image-426a5",
            "ext.shipmight.com/release-id": "f25dc",
            "ext.shipmight.com/service-target.applicationPod":
              "fail-image-426a5",
            "pod-template-hash": "cccd6c467",
          },
          name: "fail-image-426a5-cccd6c467",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "Deployment",
              name: "fail-image-426a5",
              uid: "be7d30ee-1ae9-4fcb-bf04-8153cf70fed9",
            },
          ],
          resourceVersion: "14432",
          uid: "8fa8fdfe-6c2e-49b6-bf28-f078e84ad0a0",
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              "ext.shipmight.com/app-id": "fail-image-426a5",
              "pod-template-hash": "cccd6c467",
            },
          },
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "ext.shipmight.com/app-id": "fail-image-426a5",
                "ext.shipmight.com/log-target.applicationLogs":
                  "fail-image-426a5",
                "ext.shipmight.com/metrics-target.applicationPod":
                  "fail-image-426a5",
                "ext.shipmight.com/release-id": "f25dc",
                "ext.shipmight.com/service-target.applicationPod":
                  "fail-image-426a5",
                "pod-template-hash": "cccd6c467",
              },
            },
            spec: {
              automountServiceAccountToken: false,
              containers: [
                {
                  image: "docker.io/ajhvjhsdfjhahgdf:latest",
                  imagePullPolicy: "Always",
                  name: "fail-image-426a5",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
              dnsPolicy: "ClusterFirst",
              restartPolicy: "Always",
              schedulerName: "default-scheduler",
              securityContext: {},
              terminationGracePeriodSeconds: 30,
            },
          },
        },
        status: { fullyLabeledReplicas: 1, observedGeneration: 1, replicas: 1 },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-29T17:35:24.000Z"),
          generateName: "fail-image-426a5-cccd6c467-",
          labels: {
            "ext.shipmight.com/app-id": "fail-image-426a5",
            "ext.shipmight.com/log-target.applicationLogs": "fail-image-426a5",
            "ext.shipmight.com/metrics-target.applicationPod":
              "fail-image-426a5",
            "ext.shipmight.com/release-id": "f25dc",
            "ext.shipmight.com/service-target.applicationPod":
              "fail-image-426a5",
            "pod-template-hash": "cccd6c467",
          },
          name: "fail-image-426a5-cccd6c467-pz4h8",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "ReplicaSet",
              name: "fail-image-426a5-cccd6c467",
              uid: "8fa8fdfe-6c2e-49b6-bf28-f078e84ad0a0",
            },
          ],
          resourceVersion: "14462",
          uid: "ed881c2a-92d6-49e4-93c8-9947a65bc57a",
        },
        spec: {
          automountServiceAccountToken: false,
          containers: [
            {
              image: "docker.io/ajhvjhsdfjhahgdf:latest",
              imagePullPolicy: "Always",
              name: "fail-image-426a5",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Always",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
          tolerations: [
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/not-ready",
              operator: "Exists",
              tolerationSeconds: 300,
            },
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/unreachable",
              operator: "Exists",
              tolerationSeconds: 300,
            },
          ],
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:35:24.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:35:24.000Z"),
              message: "containers with unready status: [fail-image-426a5]",
              reason: "ContainersNotReady",
              status: "False",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:35:24.000Z"),
              message: "containers with unready status: [fail-image-426a5]",
              reason: "ContainersNotReady",
              status: "False",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:35:24.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              image: "docker.io/ajhvjhsdfjhahgdf:latest",
              imageID: "",
              lastState: {},
              name: "fail-image-426a5",
              ready: false,
              restartCount: 0,
              started: false,
              state: {
                waiting: {
                  message:
                    'Back-off pulling image "docker.io/ajhvjhsdfjhahgdf:latest"',
                  reason: "ImagePullBackOff",
                },
              },
            },
          ],
          hostIP: "192.168.64.99",
          phase: "Pending",
          podIP: "172.17.0.13",
          podIPs: [{ ip: "172.17.0.13" }],
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-29T17:35:24.000Z"),
        },
      },
    ]);

    const deployments = await Deployments.list("foobar-app-1");

    expect(deployments).toEqual([
      {
        releaseId: "f25dc",
        createdAt: "2022-08-29T17:35:23Z",
        replicas: 1,
        readyReplicas: 0,
        podStatuses: [
          {
            status: "PENDING",
            message:
              "Pulling image docker.io/ajhvjhsdfjhahgdf:latest failed, retrying",
          },
        ],
      },
    ]);
  });

  it("returns deployment with all replicas in Error", async () => {
    kubernetes.listNamespacedReplicaSets.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "deployment.kubernetes.io/desired-replicas": "1",
            "deployment.kubernetes.io/max-replicas": "2",
            "deployment.kubernetes.io/revision": "1",
            "meta.helm.sh/release-name": "crash-6ab72",
            "meta.helm.sh/release-namespace": "default-project-5dafc",
          },
          creationTimestamp: parseISO("2022-08-29T17:39:06.000Z"),
          generation: 1,
          labels: {
            "ext.shipmight.com/app-id": "crash-6ab72",
            "ext.shipmight.com/log-target.applicationLogs": "crash-6ab72",
            "ext.shipmight.com/metrics-target.applicationPod": "crash-6ab72",
            "ext.shipmight.com/release-id": "28549",
            "ext.shipmight.com/service-target.applicationPod": "crash-6ab72",
            "pod-template-hash": "6f97696f9d",
          },
          name: "crash-6ab72-6f97696f9d",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "Deployment",
              name: "crash-6ab72",
              uid: "baab4bc4-8a48-416d-8a9a-c81623bd639f",
            },
          ],
          resourceVersion: "14755",
          uid: "5c0009e4-b594-4dad-8545-02e64e5d3d9b",
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              "ext.shipmight.com/app-id": "crash-6ab72",
              "pod-template-hash": "6f97696f9d",
            },
          },
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "ext.shipmight.com/app-id": "crash-6ab72",
                "ext.shipmight.com/log-target.applicationLogs": "crash-6ab72",
                "ext.shipmight.com/metrics-target.applicationPod":
                  "crash-6ab72",
                "ext.shipmight.com/release-id": "28549",
                "ext.shipmight.com/service-target.applicationPod":
                  "crash-6ab72",
                "pod-template-hash": "6f97696f9d",
              },
            },
            spec: {
              automountServiceAccountToken: false,
              containers: [
                {
                  env: [{ name: "POSTGRES_INITDB_ARGS", value: "hmm heyo" }],
                  image: "docker.io/postgres:latest",
                  imagePullPolicy: "Always",
                  name: "crash-6ab72",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
              dnsPolicy: "ClusterFirst",
              restartPolicy: "Always",
              schedulerName: "default-scheduler",
              securityContext: {},
              terminationGracePeriodSeconds: 30,
            },
          },
        },
        status: { fullyLabeledReplicas: 1, observedGeneration: 1, replicas: 1 },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-29T17:39:06.000Z"),
          generateName: "crash-6ab72-6f97696f9d-",
          labels: {
            "ext.shipmight.com/app-id": "crash-6ab72",
            "ext.shipmight.com/log-target.applicationLogs": "crash-6ab72",
            "ext.shipmight.com/metrics-target.applicationPod": "crash-6ab72",
            "ext.shipmight.com/release-id": "28549",
            "ext.shipmight.com/service-target.applicationPod": "crash-6ab72",
            "pod-template-hash": "6f97696f9d",
          },
          name: "crash-6ab72-6f97696f9d-p68tb",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "ReplicaSet",
              name: "crash-6ab72-6f97696f9d",
              uid: "5c0009e4-b594-4dad-8545-02e64e5d3d9b",
            },
          ],
          resourceVersion: "14753",
          uid: "181b94af-c86c-4e99-afd2-fc682c7f5abd",
        },
        spec: {
          automountServiceAccountToken: false,
          containers: [
            {
              env: [{ name: "POSTGRES_INITDB_ARGS", value: "hmm heyo" }],
              image: "docker.io/postgres:latest",
              imagePullPolicy: "Always",
              name: "crash-6ab72",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Always",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
          tolerations: [
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/not-ready",
              operator: "Exists",
              tolerationSeconds: 300,
            },
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/unreachable",
              operator: "Exists",
              tolerationSeconds: 300,
            },
          ],
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:39:07.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:39:21.000Z"),
              message: "containers with unready status: [crash-6ab72]",
              reason: "ContainersNotReady",
              status: "False",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:39:21.000Z"),
              message: "containers with unready status: [crash-6ab72]",
              reason: "ContainersNotReady",
              status: "False",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:39:06.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              containerID:
                "docker://25e9fd9e9dd9addd4c6ae52384c4c34c8c36b7a67a397cf641b4124d37a7419f",
              image: "postgres:latest",
              imageID:
                "docker-pullable://postgres@sha256:befb4cdc1d944bd89784b9caa287cf025f0720f9a02436038124163accd177dc",
              lastState: {},
              name: "crash-6ab72",
              ready: false,
              restartCount: 0,
              started: false,
              state: {
                terminated: {
                  containerID:
                    "docker://25e9fd9e9dd9addd4c6ae52384c4c34c8c36b7a67a397cf641b4124d37a7419f",
                  exitCode: 1,
                  finishedAt: parseISO("2022-08-29T17:39:20.000Z"),
                  reason: "Error",
                  startedAt: parseISO("2022-08-29T17:39:20.000Z"),
                },
              },
            },
          ],
          hostIP: "192.168.64.99",
          phase: "Running",
          podIP: "172.17.0.14",
          podIPs: [{ ip: "172.17.0.14" }],
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-29T17:39:07.000Z"),
        },
      },
    ]);

    const deployments = await Deployments.list("foobar-app-1");

    expect(deployments).toEqual([
      {
        releaseId: "28549",
        createdAt: "2022-08-29T17:39:06Z",
        replicas: 1,
        readyReplicas: 0,
        podStatuses: [
          {
            status: "ERRORED",
            message: "Container exited with code 1, retrying",
          },
        ],
      },
    ]);
  });

  it("returns deployment with all replicas in CrashLoopBackOff", async () => {
    kubernetes.listNamespacedReplicaSets.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "deployment.kubernetes.io/desired-replicas": "1",
            "deployment.kubernetes.io/max-replicas": "2",
            "deployment.kubernetes.io/revision": "1",
            "meta.helm.sh/release-name": "crash-6ab72",
            "meta.helm.sh/release-namespace": "default-project-5dafc",
          },
          creationTimestamp: parseISO("2022-08-29T17:39:06.000Z"),
          generation: 1,
          labels: {
            "ext.shipmight.com/app-id": "crash-6ab72",
            "ext.shipmight.com/log-target.applicationLogs": "crash-6ab72",
            "ext.shipmight.com/metrics-target.applicationPod": "crash-6ab72",
            "ext.shipmight.com/release-id": "28549",
            "ext.shipmight.com/service-target.applicationPod": "crash-6ab72",
            "pod-template-hash": "6f97696f9d",
          },
          name: "crash-6ab72-6f97696f9d",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "Deployment",
              name: "crash-6ab72",
              uid: "baab4bc4-8a48-416d-8a9a-c81623bd639f",
            },
          ],
          resourceVersion: "14755",
          uid: "5c0009e4-b594-4dad-8545-02e64e5d3d9b",
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              "ext.shipmight.com/app-id": "crash-6ab72",
              "pod-template-hash": "6f97696f9d",
            },
          },
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "ext.shipmight.com/app-id": "crash-6ab72",
                "ext.shipmight.com/log-target.applicationLogs": "crash-6ab72",
                "ext.shipmight.com/metrics-target.applicationPod":
                  "crash-6ab72",
                "ext.shipmight.com/release-id": "28549",
                "ext.shipmight.com/service-target.applicationPod":
                  "crash-6ab72",
                "pod-template-hash": "6f97696f9d",
              },
            },
            spec: {
              automountServiceAccountToken: false,
              containers: [
                {
                  env: [{ name: "POSTGRES_INITDB_ARGS", value: "hmm heyo" }],
                  image: "docker.io/postgres:latest",
                  imagePullPolicy: "Always",
                  name: "crash-6ab72",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
              dnsPolicy: "ClusterFirst",
              restartPolicy: "Always",
              schedulerName: "default-scheduler",
              securityContext: {},
              terminationGracePeriodSeconds: 30,
            },
          },
        },
        status: { fullyLabeledReplicas: 1, observedGeneration: 1, replicas: 1 },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-29T17:39:06.000Z"),
          generateName: "crash-6ab72-6f97696f9d-",
          labels: {
            "ext.shipmight.com/app-id": "crash-6ab72",
            "ext.shipmight.com/log-target.applicationLogs": "crash-6ab72",
            "ext.shipmight.com/metrics-target.applicationPod": "crash-6ab72",
            "ext.shipmight.com/release-id": "28549",
            "ext.shipmight.com/service-target.applicationPod": "crash-6ab72",
            "pod-template-hash": "6f97696f9d",
          },
          name: "crash-6ab72-6f97696f9d-p68tb",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "ReplicaSet",
              name: "crash-6ab72-6f97696f9d",
              uid: "5c0009e4-b594-4dad-8545-02e64e5d3d9b",
            },
          ],
          resourceVersion: "14770",
          uid: "181b94af-c86c-4e99-afd2-fc682c7f5abd",
        },
        spec: {
          automountServiceAccountToken: false,
          containers: [
            {
              env: [{ name: "POSTGRES_INITDB_ARGS", value: "hmm heyo" }],
              image: "docker.io/postgres:latest",
              imagePullPolicy: "Always",
              name: "crash-6ab72",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Always",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
          tolerations: [
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/not-ready",
              operator: "Exists",
              tolerationSeconds: 300,
            },
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/unreachable",
              operator: "Exists",
              tolerationSeconds: 300,
            },
          ],
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:39:07.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:39:21.000Z"),
              message: "containers with unready status: [crash-6ab72]",
              reason: "ContainersNotReady",
              status: "False",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:39:21.000Z"),
              message: "containers with unready status: [crash-6ab72]",
              reason: "ContainersNotReady",
              status: "False",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:39:06.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              containerID:
                "docker://ff39a4ca48dc63009079898edb553b0d68e1fcbb3c476b27a2e69503becf8ea6",
              image: "postgres:latest",
              imageID:
                "docker-pullable://postgres@sha256:befb4cdc1d944bd89784b9caa287cf025f0720f9a02436038124163accd177dc",
              lastState: {
                terminated: {
                  containerID:
                    "docker://ff39a4ca48dc63009079898edb553b0d68e1fcbb3c476b27a2e69503becf8ea6",
                  exitCode: 1,
                  finishedAt: parseISO("2022-08-29T17:39:23.000Z"),
                  reason: "Error",
                  startedAt: parseISO("2022-08-29T17:39:23.000Z"),
                },
              },
              name: "crash-6ab72",
              ready: false,
              restartCount: 1,
              started: false,
              state: {
                waiting: {
                  message:
                    "back-off 10s restarting failed container=crash-6ab72 pod=crash-6ab72-6f97696f9d-p68tb_default-project-5dafc(181b94af-c86c-4e99-afd2-fc682c7f5abd)",
                  reason: "CrashLoopBackOff",
                },
              },
            },
          ],
          hostIP: "192.168.64.99",
          phase: "Running",
          podIP: "172.17.0.14",
          podIPs: [{ ip: "172.17.0.14" }],
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-29T17:39:07.000Z"),
        },
      },
    ]);

    const deployments = await Deployments.list("foobar-app-1");

    expect(deployments).toEqual([
      {
        releaseId: "28549",
        createdAt: "2022-08-29T17:39:06Z",
        replicas: 1,
        readyReplicas: 0,
        podStatuses: [
          { status: "ERRORED", message: "Restarting after failure" },
        ],
      },
    ]);
  });

  it("returns deployment without available node", async () => {
    kubernetes.listNamespacedReplicaSets.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "deployment.kubernetes.io/desired-replicas": "1",
            "deployment.kubernetes.io/max-replicas": "2",
            "deployment.kubernetes.io/revision": "1",
            "meta.helm.sh/release-name": "high-432b3",
            "meta.helm.sh/release-namespace": "default-project-5dafc",
          },
          creationTimestamp: parseISO("2022-08-29T17:42:02.000Z"),
          generation: 1,
          labels: {
            "ext.shipmight.com/app-id": "high-432b3",
            "ext.shipmight.com/log-target.applicationLogs": "high-432b3",
            "ext.shipmight.com/metrics-target.applicationPod": "high-432b3",
            "ext.shipmight.com/release-id": "d9ff0",
            "ext.shipmight.com/service-target.applicationPod": "high-432b3",
            "pod-template-hash": "7bcfcf958b",
          },
          name: "high-432b3-7bcfcf958b",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "Deployment",
              name: "high-432b3",
              uid: "41a74b09-c6b5-4238-8d98-a4adb2e66503",
            },
          ],
          resourceVersion: "14976",
          uid: "6a269ef4-613e-4c81-bc15-7d332aa3fdd7",
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              "ext.shipmight.com/app-id": "high-432b3",
              "pod-template-hash": "7bcfcf958b",
            },
          },
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "ext.shipmight.com/app-id": "high-432b3",
                "ext.shipmight.com/log-target.applicationLogs": "high-432b3",
                "ext.shipmight.com/metrics-target.applicationPod": "high-432b3",
                "ext.shipmight.com/release-id": "d9ff0",
                "ext.shipmight.com/service-target.applicationPod": "high-432b3",
                "pod-template-hash": "7bcfcf958b",
              },
            },
            spec: {
              automountServiceAccountToken: false,
              containers: [
                {
                  image: "docker.io/nginx:latest",
                  imagePullPolicy: "Always",
                  name: "high-432b3",
                  resources: {
                    limits: { cpu: "100m", memory: "20Gi" },
                    requests: { cpu: "100m", memory: "20Gi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
              dnsPolicy: "ClusterFirst",
              restartPolicy: "Always",
              schedulerName: "default-scheduler",
              securityContext: {},
              terminationGracePeriodSeconds: 30,
            },
          },
        },
        status: { fullyLabeledReplicas: 1, observedGeneration: 1, replicas: 1 },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-29T17:42:02.000Z"),
          generateName: "high-432b3-7bcfcf958b-",
          labels: {
            "ext.shipmight.com/app-id": "high-432b3",
            "ext.shipmight.com/log-target.applicationLogs": "high-432b3",
            "ext.shipmight.com/metrics-target.applicationPod": "high-432b3",
            "ext.shipmight.com/release-id": "d9ff0",
            "ext.shipmight.com/service-target.applicationPod": "high-432b3",
            "pod-template-hash": "7bcfcf958b",
          },
          name: "high-432b3-7bcfcf958b-mrsw4",
          namespace: "default-project-5dafc",
          ownerReferences: [
            {
              apiVersion: "apps/v1",
              blockOwnerDeletion: true,
              controller: true,
              kind: "ReplicaSet",
              name: "high-432b3-7bcfcf958b",
              uid: "6a269ef4-613e-4c81-bc15-7d332aa3fdd7",
            },
          ],
          resourceVersion: "14975",
          uid: "b73428c1-2476-409c-898f-55018f94ce7e",
        },
        spec: {
          automountServiceAccountToken: false,
          containers: [
            {
              image: "docker.io/nginx:latest",
              imagePullPolicy: "Always",
              name: "high-432b3",
              resources: {
                limits: { cpu: "100m", memory: "20Gi" },
                requests: { cpu: "100m", memory: "20Gi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Always",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
          tolerations: [
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/not-ready",
              operator: "Exists",
              tolerationSeconds: 300,
            },
            {
              effect: "NoExecute",
              key: "node.kubernetes.io/unreachable",
              operator: "Exists",
              tolerationSeconds: 300,
            },
          ],
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T17:42:02.000Z"),
              message: "0/1 nodes are available: 1 Insufficient memory.",
              reason: "Unschedulable",
              status: "False",
              type: "PodScheduled",
            },
          ],
          phase: "Pending",
          qosClass: "Guaranteed",
        },
      },
    ]);

    const deployments = await Deployments.list("foobar-app-1");

    expect(deployments).toEqual([
      {
        releaseId: "d9ff0",
        createdAt: "2022-08-29T17:42:02Z",
        replicas: 1,
        readyReplicas: 0,
        podStatuses: [
          {
            status: "PENDING",
            message:
              "Container cannot be created due to insufficient memory in cluster",
          },
        ],
      },
    ]);
  });
});
