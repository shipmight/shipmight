# Architecture

## Navigation

- [`ARCHITECTURE.md`](../ARCHITECTURE.md)

  - [`backend/ARCHITECTURE.md`](../backend/ARCHITECTURE.md)

    - [`backend/api/ARCHITECTURE.md`](../backend/api/ARCHITECTURE.md)
    - [`backend/cli/ARCHITECTURE.md`](../backend/cli/ARCHITECTURE.md)
    - [`backend/ui/ARCHITECTURE.md`](../backend/ui/ARCHITECTURE.md)
    - [`backend/utils/ARCHITECTURE.md`](../backend/utils/ARCHITECTURE.md)

  - [`frontend/ARCHITECTURE.md`](../frontend/ARCHITECTURE.md) <- you are here

  - [`internal-charts/ARCHITECTURE.md`](../internal-charts/ARCHITECTURE.md)

## Summary

This directory contains the frontend code and static resources for Shipmight UI.

The HTTP server which serves the frontend-bundle can be found under `backend/`, in [`../backend/ui/uiServer.ts`](../backend/ui/uiServer.ts).

Static assets are under `static/` and TypeScript under `ui/`.

## Patterns

### Containers and components

React components are divided into two locations:

- `components/` stores purely presentational and stateless reusable components, such as buttons, inputs and cards
- `containers/` stores stateful components such as routers and pages

This division is not absolutely strict in the case of `containers/`, which can also define the occasional presentational components that might as well fit into `components/`. It may be better to store one-off components there, to keep `components/` simpler and more thought-out. However, over time UI views in the app should converge to reusable views, which means that over time containers should become thinner and more of the presentational component code should move into components.
