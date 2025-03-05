<p align="center"><a href="https://www.aphiria.com" target="_blank" title="Aphiria"><img src="https://www.aphiria.com/images/aphiria-logo.svg" width="200" height="56"></a></p>

<p align="center">
<a href="https://github.com/aphiria/aphiria.com/actions"><img src="https://github.com/aphiria/aphiria.com/workflows/ci/badge.svg"></a>
<a href="https://coveralls.io/github/aphiria/aphiria.com?branch=master"><img src="https://coveralls.io/repos/github/aphiria/aphiria.com/badge.svg?branch=master" alt="Coverage Status"></a>
<a href="https://psalm.dev"><img src="https://shepherd.dev/github/aphiria/aphiria.com/level.svg"></a>
</p>

# About

This repository contains the code for both https://www.aphiria.com and https://api.aphiria.com.

## Configuring Your Environment

### Install Dependencies

First, [install Docker](https://docs.docker.com/engine/install/).  Then, run `./install.sh` to install the other dependencies:

* kubectl
* Minikube
* Helm
* Helmfile
* Terraform
* doctl

> **Note:** You may have to run `chmod +x ./install.sh` to make the script executable.

### Update Your Host File

Add the following to your host file:

```
127.0.0.1 aphiria.com
127.0.0.1 api.aphiria.com
127.0.0.1 www.aphiria.com
127.0.0.1 grafana.aphiria.com
127.0.0.1 prometheus.aphiria.com
```

### Log Into Docker

```
docker login -u <username>
```

> **Note:** If you get an error trying to save your credentials, run `rm ~/.docker/config.json`.

### Configuring Multiple Clusters in kubectl

kubectl lets you configure multiple clusters (eg your DigitalOcean and minikube clusters).  To do so, download the kubeconfig file from the DigitalOcean cluster.

> **Note:** If using WSL2, copy it to your _~/_ directory and name it _digitalocean.yml_.

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
minikube start \
&& minikube dashboard
```

> **Note:** If you're running as the root user, run `minikube start --force` instead.

> **Note:** If you're having issues with starting the Minikube cluster, run `minikube delete` and then retry the commands.

### Build The Application

You must build your Docker images before you can run the application.  The following will configure Minikube to use its own Docker registry and build the images:

```
eval $(minikube -p minikube docker-env) \
&& docker build -t aphiria.com-build -f ./infrastructure/docker/build/Dockerfile . \
&& docker build -t aphiria.com-api -f ./infrastructure/docker/runtime/api/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build \
&& docker build -t aphiria.com-web -f ./infrastructure/docker/runtime/web/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build
```

> **Note:** To bust the Docker's cache, you should run `gulp build` locally prior to building the images to ensure you're building with the latest compiled documentation.

### Set Up Your Kubernetes Cluster

Use Helmfile to install the required Helm charts and apply the dev Kubernetes manifest:

```
helmfile -f ./infrastructure/kubernetes/base/helmfile.yml repos \
&& helmfile -f ./infrastructure/kubernetes/base/helmfile.yml sync \
&& kubectl apply -k ./infrastructure/kubernetes/environments/dev
```

In another console, create a tunnel to be able to connect to Minikube:

```
minikube tunnel
```

> **Note:** Be sure to enter your `sudo` password when prompted.

You should now be able to hit https://www.aphiria.com in your browser.  You will get a TLS certificate error since we're using a self-signed certificate locally.

> **Note:** If using Chrome, type `thisisunsafe` to accept the self-signed certificate.  Likewise, you'll have to do the same for the API, which you can do by visiting https://api.aphiria.com/docs/search?query=routing and typing `thisisunsafe`.

## Updating The Kubernetes Cluster

To get your Minikube cluster to pick up changes you've made locally (after re-building the Docker images), run the following commands:

```
kubectl rollout restart deployment api \
&& kubectl rollout restart deployment web
```

## Connecting to the Database

To connect locally to the PostgreSQL database in Minikube, you'll need to configure port forwarding on your machine in a separate console:

```
kubectl port-forward service/db 5432:5432
```

## Viewing Prometheus

To view the Prometheus dashboard, you'll need to configure port forwarding in a separate console:

```
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090
```

Then, visit http://localhost:9090/ in your browser.

## Viewing Grafana

To view the Grafana dashboard, visit https://grafana.aphiria.com.
