# Release process

## Release new version of shipmight image

- Make a new branch

  - Name: `release-X.X.X`

- Update changelog

  - Update [docs/Changelog.md](docs/Changelog.md)

- Make a new PR

  - In: [shipmight/shipmight](https://github.com/shipmight/shipmight)
  - Title: "Release X.X.X"

- Merge the PR

- Trigger the release

  - Locally `git checkout master && git pull`
  - Then `git tag vX.X.X`
  - Then `git push origin vX.X.X`

- Wait until release workflow is finished
  - Wait for the [workflow](https://github.com/shipmight/shipmight/actions/workflows/release.yaml)

## Update Helm charts

Go to [../helm-charts/RELEASE_PROCESS.md](../helm-charts/RELEASE_PROCESS.md) and follow the instructions.
