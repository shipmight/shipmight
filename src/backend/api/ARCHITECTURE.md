# Architecture

## Navigation

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)

  - [`backend/ARCHITECTURE.md`](../../backend/ARCHITECTURE.md)

    - [`backend/api/ARCHITECTURE.md`](../../backend/api/ARCHITECTURE.md) <- you are here
    - [`backend/cli/ARCHITECTURE.md`](../../backend/cli/ARCHITECTURE.md)
    - [`backend/ui/ARCHITECTURE.md`](../../backend/ui/ARCHITECTURE.md)
    - [`backend/utils/ARCHITECTURE.md`](../../backend/utils/ARCHITECTURE.md)

  - [`frontend/ARCHITECTURE.md`](../../frontend/ARCHITECTURE.md)

  - [`internal-charts/ARCHITECTURE.md`](../../internal-charts/ARCHITECTURE.md)

## Summary

This directory contains the backend API code for Shipmight API

The API server itself can be found in [`apiServer.ts`](apiServer.ts).

## Patterns

### Authentication

Requests are authenticated via either:

- `Authorization: Bearer <token>` HTTP header
- `shipmightBearerToken=<token>` cookie value

Where `<token>` is a JWT.

A token is obtained via username and password from `POST /v1/tokens`. Tokens expire after 5 minutes. During that window a new token can be obtained via `POST /v1/tokens/refresh`.

Passing `?cookie=write` to `POST /v1/tokens` or `POST /v1/tokens/refresh` causes a httpOnly cookie to be written. This is used in the UI; the UI doesn’t need to store the token at all. The cookie can be cleared via `POST /v1/tokens/clear?cookie=write`.

Related files:

- [`jwt.ts`](jwt.ts)

### Working with Kubernetes resources

The directory [`models/`](models/) contains code for CRUD operations related to Kubernetes API.

For example, apps in a project can be retrieved using `await Apps.list("some-project-id")`.

These files abstract away the structure of Kubernetes resources. They transform e.g. Secrets into Shipmight interfaces, and vice versa.

The file [`../utils/kubernetes.ts`](../utils/kubernetes.ts) contains consistent and simplified functions for calling the Kubernetes API via the official client.

Related files:

- [`models/`](models/)
- [`../utils/kubernetes.ts`](../utils/kubernetes.ts)

### HTTP client

When it's needed to make HTTP requests to other endpoints than Kubernetes APIs (which are done via the official Kubernetes client), `request` is used.

It is technically a deprecated library, but it is a mandatory requirement of `@kubernetes/client-node`, so it is already included in dependencies, and it also works just fine.
