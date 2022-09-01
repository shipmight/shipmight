# Configuring Loki

Shipmight integrates with Grafana Loki for:

- browsing container logs in Shipmight UI

Grafana Loki and Promtail are included as optional dependencies of the Shipmight stack.

## How it works

Promtail collects logs from containers in the cluster and sends them to Loki, which stores them (by default in an infinitely scalable S3 bucket).

Shipmight API fetches filtered logs from the Loki HTTP API for the user to view.

When the Loki-integration is disabled, features related to viewing logs are hidden in the project view, and disabled in Manage. For a description of these features, see [Logs](Logs.md).

## Enabling Loki

The following will install Loki and Promtail, and configure Shipmight to query the Loki API:

```bash
helm upgrade shipmight shipmight/shipmight-stack \
  --set loki.enabled=true \
  --set loki.config.storage_config.aws.s3=s3://<access-key>:<secret-access-key>@<s3-endpoint>/<bucket-name> \
  --set promtail.enabled=true \
  --set shipmight.config.lokiEndpoint=http://shipmight-loki:3100
```

### Configuring Loki datastore

You can configure Loki storage via `loki.config.storage_config`:

```bash
helm upgrade shipmight shipmight/shipmight-stack \
  # A) S3 bucket
  --set loki.config.storage_config.aws.s3=s3://<access-key>:<secret-access-key>@<s3-endpoint>/<bucket-name>
  # B) S3 via individual components
  --set loki.config.storage_config.aws.endpoint=<s3-endpoint> \
  --set loki.config.storage_config.aws.bucketnames=<bucket-name> \
  --set loki.config.storage_config.aws.access_key_id=<access-key> \
  --set loki.config.storage_config.aws.secret_access_key=<secret-access-key>
  # C) In-memory S3 bucket for testing purposes only (do NOT use in production)
  --set loki.config.storage_config.aws.s3=inmemory:///not-for-production
```

Refer to these links for more information on available storage configurations:

- [loki `values.yaml`](https://github.com/grafana/helm-charts/blob/main/charts/loki/values.yaml)
- [Loki Configuration Examples](https://grafana.com/docs/loki/latest/configuration/examples/)

## Disabling Loki

The following will uninstall Loki and Promtail, and disable the integration in Shipmight:

```bash
helm upgrade shipmight shipmight/shipmight-stack \
  --set loki.enabled=false \
  --set promtail.enabled=false \
  --set shipmight.config.lokiEndpoint=null
```
