# Architecture

## Navigation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) <- you are here

  - [`backend/ARCHITECTURE.md`](./backend/ARCHITECTURE.md)

    - [`backend/api/ARCHITECTURE.md`](./backend/api/ARCHITECTURE.md)
    - [`backend/cli/ARCHITECTURE.md`](./backend/cli/ARCHITECTURE.md)
    - [`backend/ui/ARCHITECTURE.md`](./backend/ui/ARCHITECTURE.md)
    - [`backend/utils/ARCHITECTURE.md`](./backend/utils/ARCHITECTURE.md)

  - [`frontend/ARCHITECTURE.md`](./frontend/ARCHITECTURE.md)

  - [`internal-charts/ARCHITECTURE.md`](./internal-charts/ARCHITECTURE.md)

## Summary

This repository contains the entire Shipmight codebase. It is divided into several parts; see the corresponding architecture documents from the menu above.

See the following diagram for an overview of the different parts of a Shipmight installation, and how they relate:

![Shipmight Architecture Overview](./src/static/doc-assets/Shipmight_Architecture_Overview.svg)

## Patterns

### Diagrams

Diagrams in this documentation can be edited using [draw.io Desktop](https://github.com/jgraph/drawio-desktop/releases).

### Code style

Uniform code style is enforced in the CI. If a branch fails code style checks, it can’t be merged.

The purpose of code style enforcement is to eliminate debate about code style in pull requests, as well as to prevent bugs and obsolete code.

All TypeScript code is linted via eslint:

- You can find the configuration at [`<root>/.eslintrc.js`](../.eslintrc.js)
- There are directory-specific overrides to separate configuration for browser and server code
- ESlint configuration should be kept as close to defaults as possible. The only situation where rules may be customized is when a rule demonstrably causes code to be worse with it than without.

Most files (.ts, .json, .md, and so on) are auto-formatted via Prettier:

- You can find the configuration at [`<root>/..prettierrc.json`](../.prettierrc.json)
- Prettier configuration should be kept as close to defaults as possible

How to work with code style tooling:

- Install the applicable plugins to your IDE. This way you will see warnings and errors inline. Your IDE should also auto-format a file when you save changes.
- From the command line you can run all code style checks at once via `yarn lint`

## Dependencies in package.json

`dependencies` should contain packages required by the back-end.

`devDependencies` should contain everything else. Packages required by the frontend are bundled into the production JS bundle, they don't need to be yarn installed in the container image.
