# Ingress-NGINX integration

## Summary

Shipmight integrates with Ingress-NGINX for:

- automating SSL certificates for domains

This is the default ingress controller supported by Shipmight, and currently no other controllers are supported.

## How it works

Shipmight adds `kubernetes.io/ingress.class: nginx` annotations to Ingresses.

For each hostname, Shipmight manages a master ingress with the `nginx.org/mergeable-ingress-type: master` annotation.

Individual domains (connecting a hostname to an app) maintain a minion ingress.

## Configuring the integration

This integration is part of the Shipmight stack. If you are using that, you don’t need to configure it separately.

There is a configuration option `shipmight.domains.ingressClass`, but it does not affect anything at the moment.
