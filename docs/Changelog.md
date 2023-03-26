# Changelog

## Unreleased

-

## 0.6.0 - 2023-03-26

### Added

- Kubernetes version: support for 1.24 (no changes; just an updated Helm chart)

## 0.5.1 - 2022-09-14

### Fixed

- Helm chart: Fixed `shipmight.ui.ingress.hosts` option
- Internal charts: Clearer names and versions when listed via `helm ls` (#4)

## 0.5.0 - 2022-09-06

### Breaking changes

- License: Shipmight is now released under GNU AGPLv3
- General: Due to significant refactoring, this update is NOT backwards-compatible with previous versions
- Kubernetes version: This version removes support for Kubernetes 1.21 and 1.22

### Added

- Jobs: Support for deploying jobs (new app type)

### Fixed

- Logs-tab: Clearer loading-state, simple error-state, clearer text when there are no recent logs
- Logs-page: Clearer text when there are no recent logs in Live-mode

## 0.4.0 - 2022-08-21

### Added

- Kubernetes version: support for 1.22 and 1.23
- Apps: Image registry defaults to first available one when creating an app
- Apps: Name validation relaxed to allow more characters (also applies to registries, projects and deploy hooks)
- Apps: Image tag -field autofills with last used value when making a new deployment
- Domains: Port defaults to 80 when leaving target app blank, so the user does not have to choose an arbitrary port
- Domains: List and delete master domains on Manage-page
- Domains: List, create and delete users on Manage-page

### Fixed

- Domains: Stop accidental reloading of app list when domain form is open

## 0.3.0 - 2022-06-07

### Added

- Applications: Latest pod statuses now visible in application list
- Applications: Deployment pod and container statuses now visible in the deployment list

### Fixed

- Applications: Image registry URL and image name are again visible when making a new deployment

## 0.2.6 - 2022-05-16

### Fixed

- Helm chart issues

## 0.2.0 - 2022-05-16

### Changed

- Loki not installed by default
- Cert-Manager not installed by default
- Deploy hook token moved from request URL to request header

## 0.1.16 - 2022-05-08

### Added

- Feature: deploy hooks
- Feature: edit an existing registry, e.g. update auth token

## 0.1.15 - 2022-04-02

### Added

- Shipmight can now be updated directly from the Manage-page

## 0.1.14 - 2022-03-27

### Fixed

- Helm chart version was incorrectly set to `v1`, which caused `dependencies` to be dropped from `Chart.yaml` upon packaging

## 0.1.13 - 2022-03-11

Initial release of Shipmight to the public

### Features

- Applications
- Domains
- Automatic SSL via Let’s Encrypt
- Log viewer
- Live application metrics
- Files
- Scaling applications
- Registries
