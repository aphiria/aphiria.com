<p align="center"><a href="https://www.aphiria.com" target="_blank" title="Aphiria"><img src="https://www.aphiria.com/images/aphiria-logo.svg" width="200" height="56"></a></p>

<p align="center">
<a href="https://github.com/aphiria/aphiria.com/actions"><img src="https://github.com/aphiria/aphiria.com/workflows/ci/badge.svg"></a>
<a href="https://coveralls.io/github/aphiria/aphiria.com?branch=master"><img src="https://coveralls.io/repos/github/aphiria/aphiria.com/badge.svg?branch=master" alt="Coverage Status"></a>
<a href="https://psalm.dev"><img src="https://shepherd.dev/github/aphiria/aphiria.com/level.svg"></a>
</p>

# About

This repository contains the code for both https://www.aphiria.com and https://api.aphiria.com.

## Configuring Your Environment

### Install Docker

Follow the [instructions](https://docs.docker.com/engine/install/).

### Install Kubectl

```
cd /tmp
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

### Install Minikube

```
cd /tmp
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

### Update Your Host File

Add the following to your host file:

```
127.0.0.1 aphiria.com
127.0.0.1 api.aphiria.com
127.0.0.1 www.aphiria.com
```

### Log Into Docker

```
docker login -u <username>
```

> **Note:** If you get an error trying to save your credentials, run `rm ~/.docker/config.json`.

### Install Helm

```
cd /tmp
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh
```

### Install Terraform

```
cd /tmp
curl -lO https://releases.hashicorp.com/terraform/1.6.4/terraform_1.6.4_linux_amd64.zip
sudo unzip terraform_1.6.4_linux_amd64.zip -d /usr/local/bin
```

Verify that Terraform installed successfully with `terraform -v`.

### Configuring Multiple Clusters in kubectl

Kubectl lets you configure multiple clusters (eg your DigitalOcean and minikube clusters).  To do so, download the kubeconfig file from the DigitalOcean cluster.

> **Note:** If using WSL2, copy it to your _~/_ directory and call it _digitalocean.yml_.

```
export KUBECONFIG=~/.kube/config:~/digitalocean.yml
kubectl config view --flatten > ~/combined.yml
cp ~/combined.yml ~/.kube/config
```

Verify that you see multiple context by running

```
kubectl config get-contexts
```

To switch contexts, simply run

```
kubectl config use-context DESIRED_CONTEXT_NAME
```

## Run The Application

### Start Minikube

Get Minikube running:

```
minikube start
minikube dashboard
```

> **Note:** If you're running as the root user, run `minikube start --force` instead.

In another console terminal, create a tunnel to be able to connect to Minikube:

```
minikube tunnel
```

### Build The Application

You must build your Docker images before you can run the application.  If using Minikube, first configure it to use the Docker registry contained within:

```
eval $(minikube -p minikube docker-env)
```

Then, build the images:

```
docker build -t aphiria.com-build -f ./infrastructure/docker/build/Dockerfile .
docker build -t aphiria.com-api -f ./infrastructure/docker/runtime/api/Dockerfile .
docker build -t aphiria.com-web -f ./infrastructure/docker/runtime/web/Dockerfile .
```

### Set Up Your Kubernetes Cluster

First, install some required custom resource definitions (CRDs):

```
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml
```

Then, install the required Helm charts:

```
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm upgrade --install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --version v1.13.2 --set installCRDs=true --set "extraArgs={--feature-gates=ExperimentalGatewayAPISupport=true}"
helm upgrade --install nginx-gateway oci://ghcr.io/nginxinc/charts/nginx-gateway-fabric  --create-namespace --wait -n nginx-gateway
```

Apply the Kubernetes manifests using Kustomize:

```
kubectl apply -k ./infrastructure/kubernetes/environments/dev
```

You should now be able to hit https://www.aphiria.com in your browser.  You will get a TLS certificate error since we're using a self-signed certificate locally.

> **Note:** If using Chrome, type `thisisunsafe` to accept the self-signed certificate.  Likewise, you'll have to do the same for the API, which you can do by visiting https://api.aphiria.com/docs/search?query=foo and typing `thisisunsafe`.

