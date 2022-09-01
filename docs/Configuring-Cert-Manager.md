# Configuring Cert-Manager

Shipmight integrates with Cert-Manager for:

- automating SSL certificates for domains

Cert-Manager is included as an optional dependency of the Shipmight stack.

## How it works

Cert-Manager watches for any Kubernetes Ingresses with the annotation `cert-manager.io/cluster-issuer`.

Shipmight can add this annotation (along with a `tls` configuration) to Ingresses that are created when users create domains in Shipmight UI. Also, Shipmight UI will show the status of the SSL certificate if an issuer is linked to a domain.

## Enabling Cert-Manager

To install Cert-Manager which is included in the Shipmight stack but disabled by default, set `cert-manager.enabled` to `true`:

```bash
helm upgrade shipmight shipmight/shipmight-stack \
  --cert-manager.enabled=true
```

In addition to enabling Cert-Manager, you must create a `ClusterIssuer`. Here's an example Let's Encrypt issuer (make sure to fill in your own email address):

```bash
echo "
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: acme
  labels:
    cert-manager-issuer.shipmight.com/id: acme
  annotations:
    cert-manager-issuer.shipmight.com/name: \"Let's Encrypt\"
spec:
  acme:
    email: your-email@example.com
    # A) Let's Encrypt STG server for testing:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    # B) Let's Encrypt PROD server
    # server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: acme-account-key
    solvers:
    - http01:
        ingress:
          class: nginx
" | kubectl apply -f -
```

Some notes about the issuer:

- Note the label `cert-manager-issuer.shipmight.com/id`. This label marks the issuer as discoverable by Shipmight.
- With the optional annotation `cert-manager-issuer.shipmight.com/name` you can customize the issuer name if it is shown in Shipmight UI at some point.
- For different types of issuers (e.g. wildcard issuers which require dynamic DNS configurations), see [Issuer Configuration](https://cert-manager.io/docs/configuration/) in the [Cert-Manager documentation](https://cert-manager.io/docs/).

If a ClusterIssuer with the `cert-manager-issuer.shipmight.com/id` label exists in the cluster, Shipmight will automatically associate with it. No other configuration is needed.

At the time of writing, there can only be 1 issuer associated to Shipmight at a time. Support for associating more issuers is an upcoming feature. Users will be able to choose from the available issuers when creating a domain.

## Disabling Cert-Manager

Follow [the official documentation](https://cert-manager.io/docs/installation/helm/#uninstalling) to uninstall Cert-Manager and related resources and CRDs. In section "Uninstalling with Helm", substitute `helm --namespace cert-manager delete cert-manager` with:

```bash
helm upgrade shipmight shipmight/shipmight-stack \
  --cert-manager.enabled=false
```
