# Introduction to Kubernetes

On this page we’ll go through two topics:

- What exactly is Kubernetes and how it works (including a summary of common terminology)
- Useful things to know when working and relying on Kubernetes

This page is intended for anyone new to Kubernetes, but the latter section may be useful for more experienced readers as well.

## What is Kubernetes

### Brief explanation of Kubernetes

Kubernetes is a way to orchestrate computer resources. What does this mean? It means that (for example) a developer can request a version X of container image X to be deployed with 256Mb RAM and 0.5vCPU allocation. Additionally they request that traffic to this container can be directed at a specific hostname (domain) and path. Kubernetes will accept these requests and make it happen on the underlying infrastructure.

![Diagram of Kubernetes simplified](images/introduction-to-kubernetes.kubernetes-diagram.svg)

The examples in the previous paragraph illustrate just a small subset of what Kubernetes can do. Things like replication, volume management, horizontal/vertical scaling, auto-scaling, private services, etc. were omitted for brevity. The concept with them is the same, though; a developer **makes a request** for a specific setup, and Kubernetes **makes it happen**.

What does “makes a request” mean? Kubernetes accepts the description of requested resources in YAML format. However, this is just a technical detail. Similarly as with other technical tools, you issue commands to Kubernetes. Generally this is done via `kubectl` which is the official Kubernetes command line tool. It accepts YAML files as input, and sends those files (called manifests) to the Kubernetes HTTP API, which then executes what is needed to be done. For more advanced use cases, you could also interact with the API directly (this is what Shipmight does).

What does “make it happen” mean? Kubernetes adapts to the underlying infrastructure. The infrastructure could be your local machine, or a managed cluster of servers by a cloud provider (“managed Kubernetes”), or a cluster or servers in a warehouse. It doesn’t matter. Kubernetes acts as a uniform interface between the infrastructure and you. When you request the deployment of a container (or an ingress, or a volume, or…) Kubernetes provisions that resource for you on the infrastructure it’s running on. The neat thing for you is that you just need to know Kubernetes, and then you can deploy your applications on any platform that supports Kubernetes.

Well… to be completely honest, there are often some infrastructure specific things to take into account anyway. For example, each cloud provider implements their own Kubernetes, including their own storage classes for volumes, which means that you need to know a bit about the platform. But way less than without Kubernetes.

### Kubernetes terminology

Quick look at the most useful Kubernetes terminology…

- **Pod** is the “smallest deployable unit of computing”. Bear with me… in layman terms, it’s a group of one or more containers, which also share networking and volumes. At its most simple, a Pod contains one container that runs in the cluster. Even if Pods are the base of workloads in Kubernetes, you as a user rarely deploy Pods. Instead you usually deploy Deployments, StatefulSets or Jobs…

- **Deployment** is an abstraction over Pods. When you deploy a Deployment, you give it a Pod template. The deployment deploys Pods according to that template. So far nothing more than a Pod, right? Well, when you make a change to the Deployment, the changes are rolled out gradually. The Deployment starts new Pods parallel to the old ones, and only when the new ones are ready, it terminates the old Pods. You don’t have to control the lifecycle of the individual Pods yourself. Deployments are generally used for deploying stateless applications. An [application](Applications.md) in Shipmight is deployed as a Deployment.

- **StatefulSet** is, like a Deployment, an abstraction over Pods. It is meant for stateful applications. A StatefulSet keeps an identity between the Pods, in order to retain consistency with storage attached to the Pods.

- **Job** is yet another abstraction over Pods. It is used for deploying Pods that run a task and then terminate. It can be used for one-off tasks like this, or the Job can contain a crontab-like schedule, which causes it to be executed periodically according to that schedule.

- **Service** is a networking resource. You can create a service to request an internal hostname in the cluster, and that hostname will direct traffic to a Pod (or a set of Pods). For example, you can create a service called `my-postgres` and target the port 5432 of a Postgres Pod with it. After that, Pods in the same namespace can connect to the Postgres database via `postgres://my-postgres`.

- **Ingress** is a request for providing external access to a set of Pods (well, to a Service which targets a set of Pods). An ingress consists of a hostname (e.g. `example.com`) and an optional path (e.g. `/foobar`). Per this request, the Ingress Controller in the cluster directs traffic from that hostname and path to the targeted Service. Ingresses don’t do anything unless an Ingress Controller is installed.

- **Ingress Controller** is an in-cluster service which monitors Ingresses and applies them whenever they are created or updated. Usually the Ingress Controller operates a reverse proxy in the cluster, and that proxy handles routing the traffic. An Ingress Controller needs to be installed to the cluster manually. Most common Ingress Controllers are Ingress-NGINX (used by Shipmight) and Traefik Ingress.

- **Node** is a server running Kubernetes. Many nodes connected together form a cluster.

- **Cluster** is a collection of nodes.

- **Label** is a key-value combination used to query resources. Any resource in Kubernetes can (and usually does) have labels. For example, running `kubectl get pod -l some-label=foobar` will list pods matching that label. Labels are also used by Services to target specific Pods, and so on.

- **Annotation** is also a key-value combination used to attach information to resources. Unlike labels, annotations are not used for querying, and therefore they can contain more data and have looser format requirements. Annotations usually contain various metadata that is useful to store in a resource.

- **Init container** is a container which is ran first in a Pod, before the main containers of the Pod are started. Init containers can be used to e.g. run database migrations or wait for specific conditions before the main Pod should start.

- **Helm** is a package manager (of sorts) for Kubernetes. It is used to install Helm charts into a cluster, i.e. `helm install -n <namespace> <releaseName> <chartName> --set <optionName>=<value>`. Helm charts consist of a set of YAML files, which are compiled with templating language. They make working with large amounts of YAML easier. Helm is very popular, but you don’t always need it to work with Kubernetes.

## Things to know

Working with and relying on Kubernetes, there are certain things you should keep in mind and learn.

### Pods will die

Never rely on pods staying on continuously without interruption.

While there are nuances to this, generally you should accept the mindset that your pods may be terminated randomly at any time without your involvement. This could be caused e.g. by maintenance being done to the cluster by your cloud provider, or by pods being evicted due to insufficient resources. This should be considered a feature of Kubernetes, not a bug or an issue.

In any case, just keep in mind that pods will die.

### Kubernetes is entirely asynchronous

When you request resources or changes from Kubernetes, Kubernetes performs instant validation on the manifests you’ve provided (possibly via a webhook to some service, as well), but after that the task of bringing those changes into effect is queued as a background task. That task may poll and wait for other tasks in the cluster to happen. Almost everything in Kubernetes happens asynchronously, due to its distributed nature. In many cases you need to monitor or poll the status of an object to see its progress.

Note that [`kubectl wait`](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#wait) exists.

### Kubernetes can appear slow

Due to the asynchronous and distributed nature of Kubernetes, it can seem slow at times. Different services in the cluster poll each other and wait for different types of conditions before executing their own actions. Sometimes you need to look around to figure out why a task is pending for a seemingly long time. This is not to say that the task cannot actually be stuck. It can. You need to look into it to figure out.

### Kubernetes is declarative

When you, for example, scale up a pod, Kubernetes will not reject your request even if you’ve allocated more memory to that Pod than is available in the entire cluster. The pod will simply remaing waiting to be scheduled. This may seem counter-intuitive, but it fits with the idea of declarativeness. Kubernetes is doing its best to adhere to your declaration of how your pods should look… it simply can’t fulfill this request at the time. It’s waiting to fulfill it, though!

## Kubernetes tools

### kubectl

Kubectl is the official Kubernetes CLI. You can find its documentation [here](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands).

### Graphical interfaces

You can find graphical interfaces for interacting with your cluster. The most popular one is [Lens](https://k8slens.dev/)

## Further reading

The [official Kubernetes website](https://kubernetes.io) contains articles on all Kubernetes resources, like [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/), [Secrets](https://kubernetes.io/docs/concepts/configuration/secret/) and [Namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/), to name a few.

They also have articles about different topics, such as [labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/) and [debugging running pods](https://kubernetes.io/docs/tasks/debug-application-cluster/debug-running-pod/).

Some may find the [API reference](https://kubernetes.io/docs/reference/) interesting and useful, as it contains the specification for every resource. On that page you can find the one-page version which is huge but contains everything.

There’s also the [`kubectl` reference](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands).

If you want to get your hands dirty with Kubernetes, we would recommend installing Minikube (see their [installation tutorial](https://minikube.sigs.k8s.io/docs/start/)). After installing, run `kubectl get node` (list nodes) and `kubectl get pod -A` (list pods from all namespaces), and get going from there (perhaps describe one of the pods via `kubectl describe pod -n <namespace> <pod>` or view its logs via `kubectl logs -n <namespace> <pod>`)! Good luck!
