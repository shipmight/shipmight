# Architecture

## Navigation

- [`ARCHITECTURE.md`](../ARCHITECTURE.md)

  - [`backend/ARCHITECTURE.md`](../backend/ARCHITECTURE.md) <- you are here

    - [`backend/api/ARCHITECTURE.md`](../backend/api/ARCHITECTURE.md)
    - [`backend/cli/ARCHITECTURE.md`](../backend/cli/ARCHITECTURE.md)
    - [`backend/ui/ARCHITECTURE.md`](../backend/ui/ARCHITECTURE.md)
    - [`backend/utils/ARCHITECTURE.md`](../backend/utils/ARCHITECTURE.md)

  - [`frontend/ARCHITECTURE.md`](../frontend/ARCHITECTURE.md)

  - [`internal-charts/ARCHITECTURE.md`](../internal-charts/ARCHITECTURE.md)

## Summary

This directory contains the server-side (“backend”) code of the Shipmight codebase.

## Patterns

### Logging

All log output is tied to a source. For example, the apiServer logs with a source of `shipmight:api:apiServer`.

Log output can be controller via the `LOG` environment variable. Setting it to a comma-separated list of source-prefixes controls which sources will output logs:

- `LOG="shipmight:api:worker:" ...`
- `LOG="shipmight:utils:" ...`

To enable all log output, like is done in production, the variable can be set to:

- `LOG="shipmight:" ...`

This logic is similar to the [debug](npmjs.com/package/debug) package on npm, but a bit more basic.

Related files:

- [`utils/logging.ts`](utils/logging.ts)
