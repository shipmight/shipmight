# Updating Shipmight

You can update Shipmight directly from the UI, or via Helm.

## Update from the UI

On the **Manage** page, you can see if a new Shipmight version is available, and update to it automatically.

![Screenshot of Update-section on Manage-page](images/updating.update.png)

If there are no updates available, the button will be disabled.

![Screenshot of disabled Update-section on Manage-page](images/updating.up-to-date.png)

## Update via Helm

You can upgrade the Helm release using the Helm CLI, if you want. This is what the automatic update option does behinid the scenes, too.

```bash
# Pull latest charts from repo
helm repo update
# Upgrade release using specific chart version
helm upgrade --version <new-version> -n <namespace> <release-name> <chart>
```

Example:

```bash
helm upgrade --version 0.1.14 -n shipmight shipmight shipmight/shipmight-stack
```
