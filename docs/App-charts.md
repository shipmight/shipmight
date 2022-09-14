# App charts

App charts are Helm charts that users can deploy via Shipmight UI.

The built-in app types ([applications](Applications.md) and [jobs](Jobs.md)) are examples of app charts. Their source code is bundled with Shipmight.

With custom app charts **you can extend Shimight to deploy any type of workload relevant to your organization**. For example, you could deploy a Postgres operator into your cluster and then let your users deploy Postgres-manifests via a custom app chart. With this ability you can customize your PaaS exactly as you need it.

## Structure of an app chart

An app chart is a regular Helm chart, but it includes a `shipmight.yaml` file.

A `values.schema.json` file is also required. Shipmight UI uses it for validating user-given input.

Example of a minimal app chart file structure:

```bash
custom-app-chart/
  templates/
    example.yaml
  Chart.yaml
  shipmight.yaml      # Contains information like terminology, UI tabs,
                      # configuration fields, etc.
  values.yaml
  values.schema.json  # Used for form validation in Shipmight UI
```

In addition to live validation of form values in the UI, `values.schema.json` is also used for validation on the back-end before the release is deployed.

## `shipmight.yaml`

Shipmight-specific configuration resides in a `shipmight.yaml` file.

It looks something like this:

```yaml
version: v1

historyMax: 10

terminology:
  singular: application
  plural: applications
  singularCapitalized: Application
  pluralCapitalized: Applications

listCard:
  nameFieldId: name
  extraDetailFieldIds:
    - imageName

logTargets:
  - id: applicationLogs
    name: Application logs

serviceTargets:
  - id: applicationPod
    name: Application pod

metricsTargets:
  - id: applicationPod
    name: Application pod

configurationCards:
  - ["name"]
  - ["imageRegistry", "imageName"]
  - ["environmentVariables"]
  - ["fileMounts"]
  - ["replicas", "memoryMb", "milliCpu"]

releaseCards:
  - ["imageTag"]

tabs:
  - id: deploy
    name: Deploy
    content:
      type: DeploymentReleaseManager

  - id: logs
    name: Logs
    content:
      type: LogViewer
      logTargetId: applicationLogs
  # ...

fields:
  - id: name
    input:
      type: SingleLineText
      placeholder: My Amazing Application
      defaultValue: ""
    useForUuid: true
    name: Name
    help: |
      Choose a descriptive name for this application.

      Must be between 1-30 characters and consist of alphabets (A-Z a-z), numbers (0-9) and spaces ( ).

  - id: imageRegistry
    input:
      type: RegistrySelect
    name: Image registry
    help: Application image will be pulled from this registry.

  # ...
```

See the following sections for descriptions of each value.

### Examples

For examples, see the internal chart source code:

- [`internal-charts/application/shipmight.yaml`](../src/internal-charts/application/shipmight.yaml)
- [`internal-charts/job/shipmight.yaml](../src/internal-charts/job/shipmight.yaml)

### `version`

Schema version, must be `v1`

### `historyMax`

How many releases are to be retained. This is passed to Helm via `--history-max <number>`. For different workload types the value may vary.

For example, in the built-in app chart for jobs, this value is `1`, because each Helm release creates a detached `Job` instance. Therefore a history of Helm releases is not necessary to keep.

### `terminology`

An object containing terminology about this app chart to be shown in the UI. For example, the application app chart has:

```yaml
terminology:
  singular: application
  plural: applications
  singularCapitalized: Application
  pluralCapitalized: Applications
```

### `listCard`

Defines how app instances are represented in "cards" in the UI, for example when listed.

For example, when applications are listed in the UI, their primary name is grabbed from the field with the ID `name`. Next to the name, the value of the field `imageName` is displayed, for easier browsing.

```yaml
listCard:
  nameFieldId: name
  extraDetailFieldIds:
    - imageName
```

### `logTargets`

Possible log targets for this app chart. IDs of log targets can be referenced to in tabs with the `LogViewer` content type.

For example, the applications app chart specifies one log target, which targets the application pod:

```yaml
logTargets:
  - id: applicationLogs
    name: Application logs
```

The Pod template is given a set of labels to add to its metadata. Example:

```yaml
spec:
  template:
    metadata:
      labels:
        {{- .Values.builtIns.labels.appId | toYaml | nindent 8 }}
        # ...
        {{- .Values.builtIns.labels.logTargets.applicationLogs | toYaml | nindent 8 }}
```

Under `tabs`, you can then instruct Shipmight to display a log viewer referencing the ID:

```yaml
- id: logs
  name: Logs
  content:
    type: LogViewer
    logTargetId: applicationLogs
```

Some app charts might want to specify more (or none) log targets. For example, if the app chart deploys a Pod and a Job, you could use multiple log targets to create different Logs-tabs in the UI, one for each.

### `serviceTargets`

Possible service targets for this app chart. Domains can be directed at service targets of apps.

For example, the applications app chart specifies one service target, which targets the application pod:

```yaml
serviceTargets:
  - id: applicationPod
    name: Application pod
```

The Pod template is given a set of labels to add to its metadata. Example:

```yaml
spec:
  template:
    metadata:
      labels:
        {{- .Values.builtIns.labels.appId | toYaml | nindent 8 }}
        # ...
        {{- .Values.builtIns.labels.serviceTargets.applicationPod | toYaml | nindent 8 }}
```

Some app charts might want to specify more (or none) service targets. For example, if the app chart deploys a public-facing frontend and also a management frontend, these could be targeted with different domains.

### `metricsTargets`

Possible metrics targets for this app chart. The Metrics-page in Shipmight UI displays metrics for the targeted Pods.

For example, the applications app chart specifies one metrics target, which targets the application pod:

```yaml
metricsTargets:
  - id: applicationPod
    name: Application pod
```

The Pod template is given a set of labels to add to its metadata. Example:

```yaml
spec:
  template:
    metadata:
      labels:
        {{- .Values.builtIns.labels.appId | toYaml | nindent 8 }}
        # ...
        {{- .Values.builtIns.labels.metricsTargets.applicationPod | toYaml | nindent 8 }}
```

Some app charts might want to specify more (or none) metrics targets. For example, if the app chart deploys a frontend and a backend as separate Pods, these could be targeted by separate metrics targets.

### `configurationCards`

Specifies cards of grouped form fields to display on the Configuration-tab of an app. These cards are also used when initially creating a new instance of an app.

For example, the application app chart groups related form fields in the following way:

```yaml
configurationCards:
  - ["name"]
  - ["imageRegistry", "imageName"]
  - ["environmentVariables"]
  - ["fileMounts"]
  - ["replicas", "memoryMb", "milliCpu"]
```

### `releaseCards`

Specifies cards of grouped form fields to display on the Deploy-tab of an app. These fields are intended to change between deployments, unlike the configuration cards which are usually not changed often.

For example, the application app chart asks for a specific image tag upon deploying a new release:

```yaml
releaseCards:
  - ["imageTag"]
```

### `tabs`

Specifies the tabs to display in Shipmight UI when viewing an app. The tab content can be one of the built-in content types.

For example, the application app chart specifies the following tabs:

```yaml
tabs:
  - id: deploy
    name: Deploy
    content:
      type: DeploymentReleaseManager
  - id: logs
    name: Logs
    content:
      type: LogViewer
      logTargetId: applicationLogs
  - id: configuration
    name: Configuration
    content:
      type: ConfigurationForm
```

The job app chart has a different first tab which is specialized in managing job instances:

```yaml
tabs:
  - id: run
    name: Run
    content:
      type: JobReleaseManager
  # ...
```

### `fields`

Defines all the configuration and release fields for the app chart.

For example, the following specifies a name field:

```yaml
fields:
  - id: name
    input:
      type: SingleLineText
      placeholder: My Amazing Application
      defaultValue: ""
    useForUuid: true
    name: Name
    help: |
      Choose a descriptive name for this application.

      Must be between 1-30 characters and consist of alphabets (A-Z a-z), numbers (0-9) and spaces ( ).
```

Refer to the [examples](#examples) above for more.

## `values.schema.json`

The values.schema.json file is a feature of Helm. When it is present, Helm validates user-given values against this OpenAPI spec.

Shipmight also uses this schema for live form field validation in the UI.

For app charts, the structure of the values-object must be as follows:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "type": "object",
  "properties": {
    "builtIns": {
      // ...
    },

    "values": {
      // ...
    },

    "resolvedValues": {
      // ...
    }
  },
  "required": ["builtIns", "values", "resolvedValues"]
}
```

Explanations of the 3 top-level properties:

- `builtIns` is supplied with various Shipmight-defined data, such as sets of labels to apply to different resources
- `values` is what would usually be the `.Values`, i.e. the user-given configuration values as-is
- `resolvedValues` contains augmented values, e.g. when the user has chosen an image registry in the UI, `.values.imageRegistry` would just contain the ID of that registry, while `.resolvedValues.imageRegistry` contains the necessary details to use it in the manifest

### Examples

For examples, see the internal chart source code:

- [`internal-charts/application/values.schema.json`](../src/internal-charts/application/values.schema.json)
- [`internal-charts/job/values.schema.json](../src/internal-charts/job/values.schema.json)

## Registering custom app charts

TBD

## Kubernetes resources

Behind the scenes the app charts is stored as a Kubernetes Secret.
