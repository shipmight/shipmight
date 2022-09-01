import { parseISO } from "date-fns";
import { mockApps } from "../testUtils/mockApps";
import { mockKubernetes } from "../testUtils/mockKubernetes";
import { nockHttp } from "../testUtils/nockHttp";
import { restoreAllMocks } from "../testUtils/restoreAllMocks";
import Runs from "./Runs";

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
    kubernetes.listNamespacedJobs.mockResolvedValueOnce([]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([]);

    const runs = await Runs.list("foobar-app-1");

    expect(kubernetes.listNamespacedJobs).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespacedJobs).toHaveBeenNthCalledWith(
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
    expect(runs).toEqual([]);
  });

  it("returns newly created run", async () => {
    kubernetes.listNamespacedJobs.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "helm.sh/resource-policy": "keep",
            "meta.helm.sh/release-name": "foobar-job-b8b85",
            "meta.helm.sh/release-namespace": "default-project-e5116",
          },
          creationTimestamp: parseISO("2022-08-27T13:28:10.000Z"),
          generation: 1,
          labels: {
            "app.kubernetes.io/managed-by": "Helm",
            "ext.shipmight.com/app-id": "foobar-job-b8b85",
            "ext.shipmight.com/release-id": "e9e65",
          },
          name: "e9e65",
          namespace: "default-project-e5116",
          resourceVersion: "15704",
        },
        spec: {
          activeDeadlineSeconds: 10000,
          backoffLimit: 4,
          completionMode: "NonIndexed",
          completions: 1,
          parallelism: 1,
          selector: {
            matchLabels: {
              "controller-uid": "3328f487-1a8d-498c-b3a9-b6f0f6b7294d",
            },
          },
          suspend: false,
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "controller-uid": "3328f487-1a8d-498c-b3a9-b6f0f6b7294d",
                "ext.shipmight.com/app-id": "foobar-job-b8b85",
                "ext.shipmight.com/log-target.jobLogs": "foobar-job-b8b85",
                "ext.shipmight.com/release-id": "e9e65",
                "job-name": "e9e65",
              },
            },
            spec: {
              containers: [
                {
                  image: "docker.io/hello-world:latest",
                  imagePullPolicy: "Always",
                  name: "foobar-job-b8b85",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
            },
          },
          ttlSecondsAfterFinished: 10000,
        },
        status: { active: 1, startTime: parseISO("2022-08-27T13:28:10.000Z") },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-27T13:28:10.000Z"),
          generateName: "e9e65-",
          labels: {
            "controller-uid": "3328f487-1a8d-498c-b3a9-b6f0f6b7294d",
            "ext.shipmight.com/app-id": "foobar-job-b8b85",
            "ext.shipmight.com/log-target.jobLogs": "foobar-job-b8b85",
            "ext.shipmight.com/release-id": "e9e65",
            "job-name": "e9e65",
          },
          name: "e9e65-qfsxp",
          namespace: "default-project-e5116",
          resourceVersion: "15707",
        },
        spec: {
          containers: [
            {
              image: "docker.io/hello-world:latest",
              imagePullPolicy: "Always",
              name: "foobar-job-b8b85",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              volumeMounts: [
                {
                  mountPath: "/var/run/secrets/kubernetes.io/serviceaccount",
                  name: "kube-api-access-kw6rn",
                  readOnly: true,
                },
              ],
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Never",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:28:10.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:28:10.000Z"),
              message: "containers with unready status: [foobar-job-b8b85]",
              reason: "ContainersNotReady",
              status: "False",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:28:10.000Z"),
              message: "containers with unready status: [foobar-job-b8b85]",
              reason: "ContainersNotReady",
              status: "False",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:28:10.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              image: "docker.io/hello-world:latest",
              imageID: "",
              lastState: {},
              name: "foobar-job-b8b85",
              ready: false,
              restartCount: 0,
              started: false,
              state: { waiting: { reason: "ContainerCreating" } },
            },
          ],
          hostIP: "192.168.64.98",
          phase: "Pending",
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-27T13:28:10.000Z"),
        },
      },
    ]);

    const runs = await Runs.list("foobar-app-1");

    expect(runs).toEqual([
      {
        releaseId: "e9e65",
        createdAt: "2022-08-27T13:28:10Z",
        jobStatus: {
          status: "RUNNING",
          message: "Container creating",
        },
      },
    ]);
  });

  it("returns running run", async () => {
    kubernetes.listNamespacedJobs.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "helm.sh/resource-policy": "keep",
            "meta.helm.sh/release-name": "foobar-job-b8b85",
            "meta.helm.sh/release-namespace": "default-project-e5116",
          },
          creationTimestamp: parseISO("2022-08-27T13:28:10.000Z"),
          generation: 1,
          labels: {
            "app.kubernetes.io/managed-by": "Helm",
            "ext.shipmight.com/app-id": "foobar-job-b8b85",
            "ext.shipmight.com/release-id": "e9e65",
          },
          name: "e9e65",
          namespace: "default-project-e5116",
          resourceVersion: "15704",
        },
        spec: {
          activeDeadlineSeconds: 10000,
          backoffLimit: 4,
          completionMode: "NonIndexed",
          completions: 1,
          parallelism: 1,
          selector: {
            matchLabels: {
              "controller-uid": "3328f487-1a8d-498c-b3a9-b6f0f6b7294d",
            },
          },
          suspend: false,
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "controller-uid": "3328f487-1a8d-498c-b3a9-b6f0f6b7294d",
                "ext.shipmight.com/app-id": "foobar-job-b8b85",
                "ext.shipmight.com/log-target.jobLogs": "foobar-job-b8b85",
                "ext.shipmight.com/release-id": "e9e65",
                "job-name": "e9e65",
              },
            },
            spec: {
              containers: [
                {
                  image: "docker.io/hello-world:latest",
                  imagePullPolicy: "Always",
                  name: "foobar-job-b8b85",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
            },
          },
          ttlSecondsAfterFinished: 10000,
        },
        status: { active: 1, startTime: parseISO("2022-08-27T13:28:10.000Z") },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-27T13:28:10.000Z"),
          generateName: "e9e65-",
          labels: {
            "controller-uid": "3328f487-1a8d-498c-b3a9-b6f0f6b7294d",
            "ext.shipmight.com/app-id": "foobar-job-b8b85",
            "ext.shipmight.com/log-target.jobLogs": "foobar-job-b8b85",
            "ext.shipmight.com/release-id": "e9e65",
            "job-name": "e9e65",
          },
          name: "e9e65-qfsxp",
          namespace: "default-project-e5116",
          resourceVersion: "15707",
        },
        spec: {
          containers: [
            {
              image: "docker.io/hello-world:latest",
              imagePullPolicy: "Always",
              name: "foobar-job-b8b85",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              volumeMounts: [
                {
                  mountPath: "/var/run/secrets/kubernetes.io/serviceaccount",
                  name: "kube-api-access-kw6rn",
                  readOnly: true,
                },
              ],
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Never",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T15:04:20Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T15:04:42Z"),
              status: "True",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T15:04:42Z"),
              status: "True",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-29T15:04:19Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              containerID:
                "docker://07940f5e519fe190c0371c74c6e7810ce550439a733f50b7258a27c9a5cda99d",
              image: "nginx:latest",
              imageID:
                "docker-pullable://nginx@sha256:b95a99feebf7797479e0c5eb5ec0bdfa5d9f504bc94da550c2f58e839ea6914f",
              lastState: {},
              name: "test-cda27",
              ready: true,
              restartCount: 0,
              started: true,
              state: {
                running: {
                  startedAt: parseISO("2022-08-29T15:04:41Z"),
                },
              },
            },
          ],
          hostIP: "192.168.64.98",
          phase: "Pending",
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-27T13:28:10.000Z"),
        },
      },
    ]);

    const runs = await Runs.list("foobar-app-1");

    expect(runs).toEqual([
      {
        releaseId: "e9e65",
        createdAt: "2022-08-27T13:28:10Z",
        jobStatus: {
          status: "RUNNING",
        },
      },
    ]);
  });

  it("returns running run with ASDASDASDSAD message", async () => {
    kubernetes.listNamespacedJobs.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "helm.sh/resource-policy": "keep",
            "meta.helm.sh/release-name": "foobar-job-b8b85",
            "meta.helm.sh/release-namespace": "default-project-e5116",
          },
          creationTimestamp: parseISO("2022-08-27T13:28:10.000Z"),
          generation: 1,
          labels: {
            "app.kubernetes.io/managed-by": "Helm",
            "ext.shipmight.com/app-id": "foobar-job-b8b85",
            "ext.shipmight.com/release-id": "8fedc",
          },
          name: "8fedc",
          namespace: "default-project-e5116",
          resourceVersion: "15704",
        },
        spec: {
          activeDeadlineSeconds: 10000,
          backoffLimit: 4,
          completionMode: "NonIndexed",
          completions: 1,
          parallelism: 1,
          selector: {
            matchLabels: {
              "controller-uid": "3328f487-1a8d-498c-b3a9-b6f0f6b7294d",
            },
          },
          suspend: false,
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "controller-uid": "3328f487-1a8d-498c-b3a9-b6f0f6b7294d",
                "ext.shipmight.com/app-id": "foobar-job-b8b85",
                "ext.shipmight.com/log-target.jobLogs": "foobar-job-b8b85",
                "ext.shipmight.com/release-id": "8fedc",
                "job-name": "8fedc",
              },
            },
            spec: {
              containers: [
                {
                  image: "docker.io/hello-world:latest",
                  imagePullPolicy: "Always",
                  name: "foobar-job-b8b85",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
            },
          },
          ttlSecondsAfterFinished: 10000,
        },
        status: { active: 1, startTime: parseISO("2022-08-27T13:28:10.000Z") },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([
      {
        apiVersion: "v1",
        kind: "Pod",
        metadata: {
          creationTimestamp: parseISO("2022-08-27T12:36:18Z"),
          generateName: "8fedc-",
          labels: {
            "controller-uid": "890e2271-a030-45ac-a2b8-c5207e6c956d",
            "ext.shipmight.com/app-id": "not-found-2daa5",
            "ext.shipmight.com/log-target.jobLogs": "not-found-2daa5",
            "ext.shipmight.com/release-id": "8fedc",
            "job-name": "8fedc",
          },
          name: "8fedc-p8kkm",
          namespace: "default-project-e5116",
          resourceVersion: "20852",
          uid: "1e18335a-68bb-4ff9-95bb-af899d59c560",
        },
        spec: {
          containers: [
            {
              image: "docker.io/kjlhaslfiuhasdlfhlksjliuahsdflihasdlkfh:latest",
              imagePullPolicy: "Always",
              name: "not-found-2daa5",
              resources: {
                limits: {
                  cpu: "100m",
                  memory: "128Mi",
                },
                requests: {
                  cpu: "100m",
                  memory: "128Mi",
                },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              volumeMounts: [
                {
                  mountPath: "/var/run/secrets/kubernetes.io/serviceaccount",
                  name: "kube-api-access-zvgnv",
                  readOnly: true,
                },
              ],
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Never",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T12:36:18Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T12:36:18Z"),
              message: "containers with unready status: [not-found-2daa5]",
              reason: "ContainersNotReady",
              status: "False",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T12:36:18Z"),
              message: "containers with unready status: [not-found-2daa5]",
              reason: "ContainersNotReady",
              status: "False",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T12:36:18Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              image: "docker.io/kjlhaslfiuhasdlfhlksjliuahsdflihasdlkfh:latest",
              imageID: "",
              lastState: {},
              name: "not-found-2daa5",
              ready: false,
              restartCount: 0,
              started: false,
              state: {
                waiting: {
                  message:
                    'Back-off pulling image "docker.io/kjlhaslfiuhasdlfhlksjliuahsdflihasdlkfh:latest"',
                  reason: "ImagePullBackOff",
                },
              },
            },
          ],
          hostIP: "192.168.64.98",
          phase: "Pending",
          podIP: "172.17.0.10",
          podIPs: [
            {
              ip: "172.17.0.10",
            },
          ],
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-27T12:36:18Z"),
        },
      },
    ]);

    const runs = await Runs.list("foobar-app-1");

    expect(runs).toEqual([
      {
        releaseId: "8fedc",
        createdAt: "2022-08-27T13:28:10Z",
        jobStatus: {
          status: "RUNNING",
          message:
            "Pulling image docker.io/kjlhaslfiuhasdlfhlksjliuahsdflihasdlkfh:latest failed, retrying",
        },
      },
    ]);
  });

  it("returns successful run", async () => {
    kubernetes.listNamespacedJobs.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "helm.sh/resource-policy": "keep",
            "meta.helm.sh/release-name": "foobar-job-b8b85",
            "meta.helm.sh/release-namespace": "default-project-e5116",
          },
          creationTimestamp: parseISO("2022-08-27T13:28:10.000Z"),
          generation: 1,
          labels: {
            "app.kubernetes.io/managed-by": "Helm",
            "ext.shipmight.com/app-id": "foobar-job-b8b85",
            "ext.shipmight.com/release-id": "e9e65",
          },
          name: "e9e65",
          namespace: "default-project-e5116",
          resourceVersion: "15729",
        },
        spec: {
          activeDeadlineSeconds: 10000,
          backoffLimit: 4,
          completionMode: "NonIndexed",
          completions: 1,
          parallelism: 1,
          selector: {
            matchLabels: {
              "controller-uid": "3328f487-1a8d-498c-b3a9-b6f0f6b7294d",
            },
          },
          suspend: false,
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "controller-uid": "3328f487-1a8d-498c-b3a9-b6f0f6b7294d",
                "ext.shipmight.com/app-id": "foobar-job-b8b85",
                "ext.shipmight.com/log-target.jobLogs": "foobar-job-b8b85",
                "ext.shipmight.com/release-id": "e9e65",
                "job-name": "e9e65",
              },
            },
            spec: {
              containers: [
                {
                  image: "docker.io/hello-world:latest",
                  imagePullPolicy: "Always",
                  name: "foobar-job-b8b85",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
            },
          },
          ttlSecondsAfterFinished: 10000,
        },
        status: {
          completionTime: parseISO("2022-08-27T13:28:22.000Z"),
          conditions: [
            {
              lastProbeTime: parseISO("2022-08-27T13:28:22.000Z"),
              lastTransitionTime: parseISO("2022-08-27T13:28:22.000Z"),
              status: "True",
              type: "Complete",
            },
          ],
          startTime: parseISO("2022-08-27T13:28:10.000Z"),
          succeeded: 1,
        },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-27T13:28:10.000Z"),
          generateName: "e9e65-",
          labels: {
            "controller-uid": "3328f487-1a8d-498c-b3a9-b6f0f6b7294d",
            "ext.shipmight.com/app-id": "foobar-job-b8b85",
            "ext.shipmight.com/log-target.jobLogs": "foobar-job-b8b85",
            "ext.shipmight.com/release-id": "e9e65",
            "job-name": "e9e65",
          },
          name: "e9e65-qfsxp",
          namespace: "default-project-e5116",
          resourceVersion: "15727",
        },
        spec: {
          containers: [
            {
              image: "docker.io/hello-world:latest",
              imagePullPolicy: "Always",
              name: "foobar-job-b8b85",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              volumeMounts: [
                {
                  mountPath: "/var/run/secrets/kubernetes.io/serviceaccount",
                  name: "kube-api-access-kw6rn",
                  readOnly: true,
                },
              ],
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Never",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:28:10.000Z"),
              reason: "PodCompleted",
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:28:10.000Z"),
              reason: "PodCompleted",
              status: "False",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:28:10.000Z"),
              reason: "PodCompleted",
              status: "False",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:28:10.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              containerID:
                "docker://e9240fa9a72185637c3a4bd140f713c5810b85a80cbeb091c136b2385aab5496",
              image: "hello-world:latest",
              imageID:
                "docker-pullable://hello-world@sha256:7d246653d0511db2a6b2e0436cfd0e52ac8c066000264b3ce63331ac66dca625",
              lastState: {},
              name: "foobar-job-b8b85",
              ready: false,
              restartCount: 0,
              started: false,
              state: {
                terminated: {
                  containerID:
                    "docker://e9240fa9a72185637c3a4bd140f713c5810b85a80cbeb091c136b2385aab5496",
                  exitCode: 0,
                  finishedAt: parseISO("2022-08-27T13:28:19.000Z"),
                  reason: "Completed",
                  startedAt: parseISO("2022-08-27T13:28:19.000Z"),
                },
              },
            },
          ],
          hostIP: "192.168.64.98",
          phase: "Succeeded",
          podIP: "172.17.0.13",
          podIPs: [{ ip: "172.17.0.13" }],
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-27T13:28:10.000Z"),
        },
      },
    ]);

    const runs = await Runs.list("foobar-app-1");

    expect(runs).toEqual([
      {
        releaseId: "e9e65",
        createdAt: "2022-08-27T13:28:10Z",
        jobStatus: {
          status: "SUCCEEDED",
          message: "Completed in 12 seconds",
        },
      },
    ]);
  });

  it("returns failed run", async () => {
    kubernetes.listNamespacedJobs.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "helm.sh/resource-policy": "keep",
            "meta.helm.sh/release-name": "this-fails-22f74",
            "meta.helm.sh/release-namespace": "default-project-e5116",
          },
          creationTimestamp: parseISO("2022-08-27T13:38:58.000Z"),
          generation: 1,
          labels: {
            "app.kubernetes.io/managed-by": "Helm",
            "ext.shipmight.com/app-id": "this-fails-22f74",
            "ext.shipmight.com/release-id": "11c0d",
          },
          name: "11c0d",
          namespace: "default-project-e5116",
          resourceVersion: "16611",
        },
        spec: {
          activeDeadlineSeconds: 10000,
          backoffLimit: 0,
          completionMode: "NonIndexed",
          completions: 1,
          parallelism: 1,
          selector: {
            matchLabels: {
              "controller-uid": "b19ab1e7-b4d3-4911-84ff-0c904065f530",
            },
          },
          suspend: false,
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "controller-uid": "b19ab1e7-b4d3-4911-84ff-0c904065f530",
                "ext.shipmight.com/app-id": "this-fails-22f74",
                "ext.shipmight.com/log-target.jobLogs": "this-fails-22f74",
                "ext.shipmight.com/release-id": "11c0d",
                "job-name": "11c0d",
              },
            },
            spec: {
              containers: [
                {
                  env: [
                    {
                      name: "POSTGRES_INITDB_ARGS",
                      value: "123jhg 12ug312kgku23 jkas",
                    },
                  ],
                  image: "docker.io/postgres:latest",
                  imagePullPolicy: "Always",
                  name: "this-fails-22f74",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
            },
          },
          ttlSecondsAfterFinished: 10000,
        },
        status: {
          conditions: [
            {
              lastProbeTime: parseISO("2022-08-27T13:39:19.000Z"),
              lastTransitionTime: parseISO("2022-08-27T13:39:19.000Z"),
              message: "Job has reached the specified backoff limit",
              reason: "BackoffLimitExceeded",
              status: "True",
              type: "Failed",
            },
          ],
          failed: 1,
          startTime: parseISO("2022-08-27T13:38:58.000Z"),
        },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-27T13:38:58.000Z"),
          generateName: "11c0d-",
          labels: {
            "controller-uid": "b19ab1e7-b4d3-4911-84ff-0c904065f530",
            "ext.shipmight.com/app-id": "this-fails-22f74",
            "ext.shipmight.com/log-target.jobLogs": "this-fails-22f74",
            "ext.shipmight.com/release-id": "11c0d",
            "job-name": "11c0d",
          },
          name: "11c0d-fh259",
          namespace: "default-project-e5116",
          resourceVersion: "16598",
        },
        spec: {
          containers: [
            {
              env: [
                {
                  name: "POSTGRES_INITDB_ARGS",
                  value: "123jhg 12ug312kgku23 jkas",
                },
              ],
              image: "docker.io/postgres:latest",
              imagePullPolicy: "Always",
              name: "this-fails-22f74",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              volumeMounts: [
                {
                  mountPath: "/var/run/secrets/kubernetes.io/serviceaccount",
                  name: "kube-api-access-ngw8w",
                  readOnly: true,
                },
              ],
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Never",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:38:58.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:38:58.000Z"),
              reason: "PodFailed",
              status: "False",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:38:58.000Z"),
              reason: "PodFailed",
              status: "False",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:38:58.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              containerID:
                "docker://b2cbbb2d5fea57a4d65b252f2bd23120bbc4e6455a2bbec2f4ae147f80407d5c",
              image: "postgres:latest",
              imageID:
                "docker-pullable://postgres@sha256:befb4cdc1d944bd89784b9caa287cf025f0720f9a02436038124163accd177dc",
              lastState: {},
              name: "this-fails-22f74",
              ready: false,
              restartCount: 0,
              started: false,
              state: {
                terminated: {
                  containerID:
                    "docker://b2cbbb2d5fea57a4d65b252f2bd23120bbc4e6455a2bbec2f4ae147f80407d5c",
                  exitCode: 1,
                  finishedAt: parseISO("2022-08-27T13:39:06.000Z"),
                  reason: "Error",
                  startedAt: parseISO("2022-08-27T13:39:05.000Z"),
                },
              },
            },
          ],
          hostIP: "192.168.64.98",
          phase: "Failed",
          podIP: "172.17.0.13",
          podIPs: [{ ip: "172.17.0.13" }],
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-27T13:38:58.000Z"),
        },
      },
    ]);

    const runs = await Runs.list("foobar-app-1");

    expect(runs).toEqual([
      {
        releaseId: "11c0d",
        createdAt: "2022-08-27T13:38:58Z",
        jobStatus: {
          status: "FAILED",
          // No message, job simply failed
        },
      },
    ]);
  });

  it("returns retried run", async () => {
    kubernetes.listNamespacedJobs.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "helm.sh/resource-policy": "keep",
            "meta.helm.sh/release-name": "postgres-fail-4a1df",
            "meta.helm.sh/release-namespace": "default-project-e5116",
          },
          creationTimestamp: parseISO("2022-08-27T13:30:41.000Z"),
          generation: 1,
          labels: {
            "app.kubernetes.io/managed-by": "Helm",
            "ext.shipmight.com/app-id": "postgres-fail-4a1df",
            "ext.shipmight.com/release-id": "ea307",
          },
          name: "ea307",
          namespace: "default-project-e5116",
          resourceVersion: "15943",
        },
        spec: {
          activeDeadlineSeconds: 10000,
          backoffLimit: 4,
          completionMode: "NonIndexed",
          completions: 1,
          parallelism: 1,
          selector: {
            matchLabels: {
              "controller-uid": "c5df5f63-3354-4e4e-b75b-f9758738d7bf",
            },
          },
          suspend: false,
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "controller-uid": "c5df5f63-3354-4e4e-b75b-f9758738d7bf",
                "ext.shipmight.com/app-id": "postgres-fail-4a1df",
                "ext.shipmight.com/log-target.jobLogs": "postgres-fail-4a1df",
                "ext.shipmight.com/release-id": "ea307",
                "job-name": "ea307",
              },
            },
            spec: {
              containers: [
                {
                  env: [
                    {
                      name: "POSTGRES_INITDB_ARGS",
                      value: "hsdf9hkjasdf asdf98 lkj",
                    },
                  ],
                  image: "docker.io/postgres:latest",
                  imagePullPolicy: "Always",
                  name: "postgres-fail-4a1df",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
            },
          },
          ttlSecondsAfterFinished: 10000,
        },
        status: {
          active: 1,
          failed: 1,
          startTime: parseISO("2022-08-27T13:30:41.000Z"),
        },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-27T13:30:41.000Z"),
          generateName: "ea307-",
          labels: {
            "controller-uid": "c5df5f63-3354-4e4e-b75b-f9758738d7bf",
            "ext.shipmight.com/app-id": "postgres-fail-4a1df",
            "ext.shipmight.com/log-target.jobLogs": "postgres-fail-4a1df",
            "ext.shipmight.com/release-id": "ea307",
            "job-name": "ea307",
          },
          name: "ea307-822rh",
          namespace: "default-project-e5116",
          resourceVersion: "15939",
        },
        spec: {
          containers: [
            {
              env: [
                {
                  name: "POSTGRES_INITDB_ARGS",
                  value: "hsdf9hkjasdf asdf98 lkj",
                },
              ],
              image: "docker.io/postgres:latest",
              imagePullPolicy: "Always",
              name: "postgres-fail-4a1df",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              volumeMounts: [
                {
                  mountPath: "/var/run/secrets/kubernetes.io/serviceaccount",
                  name: "kube-api-access-qwtcb",
                  readOnly: true,
                },
              ],
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Never",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:30:41.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:31:11.000Z"),
              reason: "PodFailed",
              status: "False",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:31:11.000Z"),
              reason: "PodFailed",
              status: "False",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:30:41.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              containerID:
                "docker://98b154835989148ae4d5c7837ef3bdf8271d2ceca571b07da598d1defba80998",
              image: "postgres:latest",
              imageID:
                "docker-pullable://postgres@sha256:befb4cdc1d944bd89784b9caa287cf025f0720f9a02436038124163accd177dc",
              lastState: {},
              name: "postgres-fail-4a1df",
              ready: false,
              restartCount: 0,
              started: false,
              state: {
                terminated: {
                  containerID:
                    "docker://98b154835989148ae4d5c7837ef3bdf8271d2ceca571b07da598d1defba80998",
                  exitCode: 1,
                  finishedAt: parseISO("2022-08-27T13:31:11.000Z"),
                  reason: "Error",
                  startedAt: parseISO("2022-08-27T13:31:10.000Z"),
                },
              },
            },
          ],
          hostIP: "192.168.64.98",
          phase: "Failed",
          podIP: "172.17.0.13",
          podIPs: [{ ip: "172.17.0.13" }],
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-27T13:30:41.000Z"),
        },
      },
      {
        metadata: {
          creationTimestamp: parseISO("2022-08-27T13:31:13.000Z"),
          generateName: "ea307-",
          labels: {
            "controller-uid": "c5df5f63-3354-4e4e-b75b-f9758738d7bf",
            "ext.shipmight.com/app-id": "postgres-fail-4a1df",
            "ext.shipmight.com/log-target.jobLogs": "postgres-fail-4a1df",
            "ext.shipmight.com/release-id": "ea307",
            "job-name": "ea307",
          },
          name: "ea307-cw6wj",
          namespace: "default-project-e5116",
          resourceVersion: "15945",
        },
        spec: {
          containers: [
            {
              env: [
                {
                  name: "POSTGRES_INITDB_ARGS",
                  value: "hsdf9hkjasdf asdf98 lkj",
                },
              ],
              image: "docker.io/postgres:latest",
              imagePullPolicy: "Always",
              name: "postgres-fail-4a1df",
              resources: {
                limits: { cpu: "100m", memory: "128Mi" },
                requests: { cpu: "100m", memory: "128Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              volumeMounts: [
                {
                  mountPath: "/var/run/secrets/kubernetes.io/serviceaccount",
                  name: "kube-api-access-9nsbm",
                  readOnly: true,
                },
              ],
            },
          ],
          dnsPolicy: "ClusterFirst",
          enableServiceLinks: true,
          nodeName: "minikube",
          preemptionPolicy: "PreemptLowerPriority",
          priority: 0,
          restartPolicy: "Never",
          schedulerName: "default-scheduler",
          securityContext: {},
          serviceAccount: "default",
          serviceAccountName: "default",
          terminationGracePeriodSeconds: 30,
        },
        status: {
          conditions: [
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:31:13.000Z"),
              status: "True",
              type: "Initialized",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:31:13.000Z"),
              message: "containers with unready status: [postgres-fail-4a1df]",
              reason: "ContainersNotReady",
              status: "False",
              type: "Ready",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:31:13.000Z"),
              message: "containers with unready status: [postgres-fail-4a1df]",
              reason: "ContainersNotReady",
              status: "False",
              type: "ContainersReady",
            },
            {
              lastProbeTime: null,
              lastTransitionTime: parseISO("2022-08-27T13:31:13.000Z"),
              status: "True",
              type: "PodScheduled",
            },
          ],
          containerStatuses: [
            {
              image: "docker.io/postgres:latest",
              imageID: "",
              lastState: {},
              name: "postgres-fail-4a1df",
              ready: false,
              restartCount: 0,
              started: false,
              state: { waiting: { reason: "ContainerCreating" } },
            },
          ],
          hostIP: "192.168.64.98",
          phase: "Pending",
          qosClass: "Guaranteed",
          startTime: parseISO("2022-08-27T13:31:13.000Z"),
        },
      },
    ]);

    const runs = await Runs.list("foobar-app-1");

    expect(runs).toEqual([
      {
        releaseId: "ea307",
        createdAt: "2022-08-27T13:30:41Z",
        jobStatus: {
          status: "RUNNING",
          message: "Failed 1 times, retrying",
        },
      },
    ]);
  });

  it("returns timed out run", async () => {
    kubernetes.listNamespacedJobs.mockResolvedValueOnce([
      {
        metadata: {
          annotations: {
            "helm.sh/resource-policy": "keep",
            "meta.helm.sh/release-name": "asd-878c0",
            "meta.helm.sh/release-namespace": "default-project-e5116",
          },
          creationTimestamp: parseISO("2022-08-27T12:27:43.000Z"),
          generation: 1,
          labels: {
            "app.kubernetes.io/managed-by": "Helm",
            "ext.shipmight.com/app-id": "asd-878c0",
            "ext.shipmight.com/release-id": "df9e6",
          },
          name: "df9e6",
          namespace: "default-project-e5116",
          resourceVersion: "11607",
        },
        spec: {
          activeDeadlineSeconds: 10,
          backoffLimit: 4,
          completionMode: "NonIndexed",
          completions: 1,
          parallelism: 1,
          selector: {
            matchLabels: {
              "controller-uid": "ccd6831a-0f24-4615-a18c-e7e0819db3db",
            },
          },
          suspend: false,
          template: {
            metadata: {
              creationTimestamp: null,
              labels: {
                "controller-uid": "ccd6831a-0f24-4615-a18c-e7e0819db3db",
                "ext.shipmight.com/app-id": "asd-878c0",
                "ext.shipmight.com/log-target.jobLogs": "asd-878c0",
                "ext.shipmight.com/release-id": "df9e6",
                "job-name": "df9e6",
              },
            },
            spec: {
              containers: [
                {
                  image: "docker.io/nginx:latest",
                  imagePullPolicy: "Always",
                  name: "asd-878c0",
                  resources: {
                    limits: { cpu: "100m", memory: "128Mi" },
                    requests: { cpu: "100m", memory: "128Mi" },
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                },
              ],
            },
          },
          ttlSecondsAfterFinished: 10000,
        },
        status: {
          conditions: [
            {
              lastProbeTime: parseISO("2022-08-27T12:27:53.000Z"),
              lastTransitionTime: parseISO("2022-08-27T12:27:53.000Z"),
              message: "Job was active longer than specified deadline",
              reason: "DeadlineExceeded",
              status: "True",
              type: "Failed",
            },
          ],
          failed: 1,
          startTime: parseISO("2022-08-27T12:27:43.000Z"),
        },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([]);

    const runs = await Runs.list("foobar-app-1");

    expect(runs).toEqual([
      {
        releaseId: "df9e6",
        createdAt: "2022-08-27T12:27:43Z",
        jobStatus: {
          message: "Did not finish within 10 seconds",
          status: "FAILED",
        },
      },
    ]);
  });
});

describe("delete", () => {
  it("throws if Job does not exist", async () => {
    kubernetes.listNamespacedJobs.mockResolvedValueOnce([]);
    kubernetes.deleteNamespacedJob.mockResolvedValueOnce();

    await expect(async () => {
      await Runs.delete("foobar-project-1", "foobar-release-1");
    }).rejects.toThrow(/job with release ID foobar-release-1 does not exist/);

    expect(kubernetes.listNamespacedJobs).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespacedJobs).toHaveBeenNthCalledWith(
      1,
      "foobar-project-1",
      "ext.shipmight.com/release-id=foobar-release-1"
    );
    expect(kubernetes.deleteNamespacedJob).toHaveBeenCalledTimes(0);
  });

  it("deletes Job", async () => {
    kubernetes.listNamespacedJobs.mockResolvedValueOnce([
      {
        metadata: {
          namespace: "foobar-project-1",
          name: "foobar-job-1",
        },
      },
    ]);
    kubernetes.deleteNamespacedJob.mockResolvedValueOnce();

    await Runs.delete("foobar-project-1", "foobar-release-1");

    expect(kubernetes.listNamespacedJobs).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespacedJobs).toHaveBeenNthCalledWith(
      1,
      "foobar-project-1",
      "ext.shipmight.com/release-id=foobar-release-1"
    );
    expect(kubernetes.deleteNamespacedJob).toHaveBeenCalledTimes(1);
    expect(kubernetes.deleteNamespacedJob).toHaveBeenNthCalledWith(
      1,
      "foobar-project-1",
      "foobar-job-1"
    );
  });
});
