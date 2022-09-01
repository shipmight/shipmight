# Development

This document consists of the following sections:

1. [Local Shipmight development environment](#local-shipmight-development-environment)
1. [Useful commands, tools, operations](#useful-commands-tools-operations)
1. [Running tests](#running-tests)
1. [Developer tooling](#developer-tooling)
1. [Writing documentation](#writing-documentation)
1. [Next steps](#next-steps)

## Local Shipmight development environment

### Requirements

Make sure you have the following installed:

- Node.js 16 (perhaps via [nvm](https://github.com/nvm-sh/nvm))
- [yarn](https://yarnpkg.com/)
- [Minikube](https://minikube.sigs.k8s.io/)
- [Helm](https://helm.sh/)

### Pull the source code

Pull all Shipmight repositories into one parent directory, so your directory structure looks like this:

```
shipmight-code/
├─ shipmight/
├─ helm-charts/
└─ shipmight-site/
```

At the minimum you need `shipmight/` and `helm-charts/`, because the former uses the latter to setup the local cluster.

```bash
cd shipmight-code
git clone git@github.com:shipmight/shipmight.git
git clone git@github.com:shipmight/helm-charts.git
git clone git@github.com:shipmight/shipmight-site.git # Optional, pull if you need it
```

### Start a local cluster

Run `yarn cluster` to start a local dev cluster via Minikube. It will check some versions, install some helm repositories and finally start the cluster.

```bash
yarn cluster

# Or with specific minikube driver (default is hyperkit)
MINIKUBE_DRIVER=virtualbox yarn cluster
```

### Start the local server and processes

Run `yarn dev` to start the UI server as well as other CLI processes (worker, api, etc). They rebuild and restart on file changes.

```bash
yarn dev
```

You should see a lot of output, and eventually (after the kubernetes dependencies have started), you’ll see something along these lines:

```
[...]
shipmight:backend:cli:commands:uiCommand listening at 3000
shipmight:backend:cli:commands:apiCommand listening at 3001
[...]
```

### Open Shipmight in your browser

Now open http://localhost:3000 in your browser to access the Shipmight UI.

### Shutting down the local cluster

Run `minikube delete` to delete the local cluster. No extra actions are needed, this cleans up everything.

## Useful commands, tools, operations

### Making requests to a domain or a public port

If you have mapped a domain to an application from the UI, you can simulate requests to it directly via the minikube IP for debugging purposes.

#### Domains

Run the helper command `yarn curl` to get a list of example curl commands with the minikube IP address and port prefilled for making requests to a domain in the cluster:

```shell
$ yarn curl

→ Test a http domain:
  curl -H 'Host: shipmight-test.com' http://192.168.64.9:31351

→ Test a https domain:
  curl --insecure --connect-to shipmight-test.com:443:192.168.64.9:31351 https://shipmight-test.com

→ Or override DNS via /etc/hosts:
  192.168.64.9 shipmight-test.com

```

### Developing app charts

`yarn dev` monitors changes to app charts in `src/internal-charts` and reinstalls them upon file changes. The watched charts can be found in array `reloadInternalCharts` in `build.js`.

### Installing the whole Shipmight stack in Minikube

The scripts above install just parts of the stack into the cluster. The rest is ran outside the cluster via `yarn dev`. If you need to test also Shipmight code running inside the cluster, follow these steps.

First, build the image utilizing Minikube container runtime. No need to have Docker running.

```bash
minikube image build -t shipmight-dev:latest -f release/Dockerfile .
```

Then install or upgrade the Helm release with `-f ./release/dev-utils/dev-values.yaml`. You can re-run this command as many times as needed, e.g. after changing config values (but see below for extra actions when you've rebuilt the image).

```bash
helm upgrade --install -n shipmight shipmight ../helm-charts/charts/shipmight-stack -f ./release/dev-utils/dev-values.yaml
```

After installing, you can find the load balancer URL via the helper command `yarn curl`:

```shell
$ yarn curl

→ Test a http domain:
  curl -H 'Host: shipmight-test.com' http://192.168.64.9:31351
                                     ^^^^^^^^^^^^^^^^^^^^^^^^^ This is the load balancer URL
```

Append `/shipmight` to it and you get the full URL which you can open in your browser, e.g. http://192.168.64.9:31351/shipmight

If you rebuild the local image (without changing deployment manifests), the pods won’t be recreated even if you run `helm upgrade` again. In order to trigger the recreation of the pods, first rebuild the image via the `minikube image build ...` command above, and then just delete the Kubernetes Pods manually. The deployment will automatically create new ones.

```bash
kubectl delete pods -n shipmight -l app.kubernetes.io/name=shipmight
```

When you want to revert back to normal `yarn dev` workflow, you should be able to reset the local cluster back to by running `yarn cluster` again.

```bash
yarn cluster
```

### Querying Loki API

While running `yarn dev`, a port is opened to the Loki API. It can be useful for debugging purposes, for running custom requests against the API. For example, to list all labels:

```bash
curl http://localhost:7001/loki/api/v1/labels | jq
```

## Running tests

### Run all tests

Run tests via `yarn test`:

```bash
yarn test
```

This command does not have any external dependencies (like databases or minikube). You can run it without a local cluster, etc.

### Filtering tests

The test command uses `jest`, so you can utilize the usual jest options.

E.g. filter by suite or test name:

```bash
yarn test appDeploymentsRouter
yarn test -t "validates name"
```

### Log output

To enable log output, use the LOG environment variable:

```bash
LOG="shipmight:" yarn test
```

THe `LOG` environment variable can be used for more specific log filtering too. Multiple sources can be delimited via comma. For example:

```bash
LOG="shipmight:api:apiServer,shipmight:api:requestHandlers:deployHookCallbackRouter" yarn test
```

## Developer tooling

### Linters, etc.

For convenience, you should install autoformatter plugins to your editor of choice. This project uses:

- Prettier (more information under [Code style](ARCHITECTURE.md#code-style))

## Writing documentation

Documentation lives in the [`docs/`](docs/) directory.

### Typography

The following typography rules must be followed:

- Use smart quotes: `“` `”`
- Use smart apostrophes: `’`
- Use smart ellipsis: `…`

## Next steps

### Diving into the codebase

Start from [`src/ARCHITECTURE.md`](src/ARCHITECTURE.md).
