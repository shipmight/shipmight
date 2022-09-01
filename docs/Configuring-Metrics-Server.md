# Configuring Metrics Server

## Summary

Shipmight integrates with Metrics Server for:

- viewing real-time CPU and memory metrics for app containers

Metrics Server is included as an optional dependency of the Shipmight stack. Note that cloud providers may offer their own installation of Metrics Server, and you should prefer them if available.

## How it works

When Metrics Server is enabled, it enables additional endpoints in Kubernetes API. Shipmight automatically uses these endpoints, if they are available, to display real-time container metrics in Shipmight UI. The functionality can be compared to running `kubectl top`.

Note that the metrics are not persisted. Only real-time metrics are shown.

## Enabling Metrics Server

There are two possible ways to install Metrics Server:

- Preconfigured installation by your cloud provider (recommended)
- Installing Metrics Server with the Shipmight stack (may need manual configuration)

For the preconfigured option, consult your cloud provider documentation. Usually there's a one-click installation of Metrics Server available.

If you decide to install Metrics Server with the Shipmight stack, here's an example configuration:

```bash
helm upgrade shipmight shipmight/shipmight-stack \
  --set metrics-server.enabled=true
```

If Metrics Server is installed in the cluster, Shipmight will automatically use it. No other configuration is needed.
