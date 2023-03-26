# Requirements

## Kubernetes version

See the table below for supported Kubernetes versions:

| Kubernetes version | 1.21 | 1.22 | 1.23 | 1.24 | 1.25 | 1.26 |
| ------------------ | ---- | ---- | ---- | ---- | ---- | ---- |
| Shipmight 0.6      |      |      |      | \*   | \*   | \*   |
| Shipmight 0.5      |      |      | \*   |      |      |      |
| Shipmight 0.4      | \*   | \*   | \*   |      |      |      |
| Shipmight 0.3      | \*   |      |      |      |      |      |

## Resource requirements

### Default resource requirements

The default Shipmight stack installation has been optimized to require as little resources as possible in order to run everything at small scale.

See the table below for a list of pods installed in Shipmight stack (shown values are resource limits; requests may be even lower).

| Component       | RAM        | vCPU     |
| --------------- | ---------- | -------- |
| Shipmight       |            |          |
| ├ shipmight-api | 400Mi      | 100m     |
| └ shipmight-ui  | 100Mi      | 100m     |
| Loki            | 256Mi      | 200m     |
| Promtail        | 128Mi      | 200m     |
| Ingress-NGINX   | 128Mi      | 100m     |
| Cert-Manager    |            |          |
| ├ cert-manager  | 64Mi       | 10m      |
| ├ cainjector    | 64Mi       | 10m      |
| └ webhook       | 64Mi       | 10m      |
| Metrics Server  | 64Mi       | 10m      |
| **Total**       | **1268Mi** | **740m** |

There are some additional jobs (e.g. shipmight install, cert-manager startup api check) which consume resources for a short time.

Any extra resources in your cluster are left for your applications.

Note that you should always have spare resources in the cluster or turn on auto-scaling for your node groups to ensure that Kubernetes is able to run occasional jobs and recycle and reschedule pods when needed.

### Customizing resource requirements

You can scale each component individually.

See [Resources](Configuring-resources.md).
