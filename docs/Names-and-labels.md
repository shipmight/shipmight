# Names and labels

Shipmight employs a consistent naming and labeling strategy to all created Kubernetes resources.

## Names

Resources created by Shipmight have a unique ID, which consists of the resource name in a “slugified” form (can be turned off) and a number of random characters (can be configured, defaults to 5).

Example names:

- `examplecom-10e82`

Resource names can't be used for querying resources of a specific type. Labels can.

## Labels

Labels are used for storing resource-specific values which should also be queryable. Usually this includes things like related IDs and simple categories for grouping.

Label keys follow the pattern: `<resourceType>.shipmight.com/<field>`, where:

- `resourceType` is one of the values listed below
- `field` is some field related to the resource type (snake-case)

Example labels:

- `app.shipmight.com/project-id: someproject-12345`
- `master-domain.shipmight.com/hostname: example.com`

Possible values for `resourceType`:

- `app`
- `cert-manager-issuer`
- `deployment`
- `domain`
- `ext` (special type for labels embedded into app charts)
- `app-chart`
- `file`
- `master-domain`
- `project`
- `registry`
- `user`

### Links

Shipmight utilizes Kubernetes labels for querying related resources. For example, a domain can have the label `domains.shipmight.com/app-id: <id>` which can be used to list domains linked to a specific app. For most resource types this is sufficient enough.

In case of apps, though, a link to a resource may be contained within the `values` payload. For example, a `values.fileMounts` contains references to files via their IDs. A registry selection for an app also references to a registry via its ID.

In these cases the resource IDs are extracted from `values` and added as additional labels to the Secret:

- `app.shipmight.com/linked-file-id.<fileId>: true`
- `app.shipmight.com/linked-registry-id.<registryId>: true`

This is simply to allow for querying related resources without having to read the payload of every Secret to check if it contains such a reference.

## Annotations

Annotations are used for storing resource-specific values which do not need to be queryable and/or contain data which is not possible to store in a label value.

Annotation names follow the same pattern as labels: `<resourceType>.shipmight.com/<field>`

Refer to [Labels](#labels) for more information.
