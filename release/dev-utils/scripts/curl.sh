#!/bin/bash

set -e

IP=$(minikube ip)
HTTP_PORT=$(kubectl get service shipmight-ingress-nginx-controller -n shipmight -o jsonpath='{.spec.ports[0].nodePort}')
HTTPS_PORT=$(kubectl get service shipmight-ingress-nginx-controller -n shipmight -o jsonpath='{.spec.ports[1].nodePort}')

echo ""
echo "→ Test a http domain:"
echo "  curl -H 'Host: shipmight-test.com' http://$IP:$HTTP_PORT"
echo ""
echo "→ Test a https domain:"
echo "  curl --insecure --connect-to shipmight-test.com:443:$IP:$HTTPS_PORT https://shipmight-test.com"
echo ""
echo "→ Or override DNS via /etc/hosts:"
echo "  $IP shipmight-test.com"
echo ""
