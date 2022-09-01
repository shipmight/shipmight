#!/bin/bash

set -e

echo "┌───────────────────┐"
echo "│ CHECKING VERSIONS │"
echo "└───────────────────┘"

node --version | grep "v16" || { echo "FAIL unsupported node version"; exit 1; }
yarn --version | grep "1.22" || { echo "FAIL unsupported yarn version"; exit 1; }
minikube version || { echo "FAIL minikube is required"; exit 1; }
helm version | grep "v3.8.1" || { echo "FAIL unsupported helm version"; exit 1; }

echo "┌────────────────────────┐"
echo "│ CONFIGURING HELM REPOS │"
echo "└────────────────────────┘"

helm repo add minio https://charts.min.io/
helm repo update

echo "┌───────────────────────────┐"
echo "│ STARTING MINIKUBE CLUSTER │"
echo "└───────────────────────────┘"

MINIKUBE_DRIVER="${MINIKUBE_DRIVER:-hyperkit}"
minikube start --driver $MINIKUBE_DRIVER --memory 4gb --cpus 2 --kubernetes-version=v1.23.9
minikube addons enable metrics-server
helm --kube-context minikube upgrade --install --create-namespace -n minio minio minio/minio -f ./release/dev-utils/dev-minio-values.yaml
helm --kube-context minikube upgrade --install --create-namespace -n shipmight shipmight ../helm-charts/charts/shipmight-stack -f ./release/dev-utils/dev-values.yaml --set shipmight.enabled=false
kubectl --context minikube apply -f ./release/dev-utils/self-signed-cluster-issuer.yaml

echo "┌───────┐"
echo "│ READY │"
echo "└───────┘"
echo "→ Done!"
echo "  You can delete the cluster via: minikube delete"
