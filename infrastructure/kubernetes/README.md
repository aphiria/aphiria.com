# Install

## Configuring Your Environment

### Log Into Docker

```
docker login -u <username>
```

### Install Kubectl

Follow the [instructions](https://kubernetes.io/docs/tasks/tools).

### Install Minikube

Follow the [instructions](https://minikube.sigs.k8s.io/docs/start/).

### Update Your Host File

Add the following to your host file:

```
127.0.0.1 aphiria.com
127.0.0.1 api.aphiria.com
127.0.0.1 www.aphiria.com
```

### Install Helm

Follow the [instructions](https://helm.sh/docs/intro/install/).

### Install Terraform

Do the following:

```
cd /tmp
curl -lO https://releases.hashicorp.com/terraform/1.6.4/terraform_1.6.4_linux_amd64.zip
sudo unzip terraform_1.6.4_linux_amd64.zip -d /usr/local/bin
```

Verify that Terraform installed successfully with `terraform -v`.

## Run The Application

### Start Minikube

```
minikube start
minikube dashboard
```

> **Note:** If you're running as the root user, run `minikube start --force` instead.

In another console terminal, create a tunnel to be able to connect to Minikube with:

```
minikube tunnel
```

If you want to test out local Docker images in your Kubernetes cluster, run the following so that Docker images are pulled into Minikube's registry:

```
eval $(minikube -p minikube docker-env)
```

### Set Up Your Kubernetes Cluster

Install the custom resource definitions (CRDs) your cluster will need:

```
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml
```


Install the required Helm charts:

```
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm upgrade --install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --version v1.13.2 --set installCRDs=true
helm upgrade --install nginx-gateway oci://ghcr.io/nginxinc/charts/nginx-gateway-fabric  --create-namespace --wait -n nginx-gateway
```

Finally, apply the Kubernetes manifests:

```
kubectl apply -f infrastructure/kubernetes/env-var-secrets-dev.yml -f infrastructure/kubernetes/digitalocean-secrets-dev.yml
kubectl apply -f infrastructure/kubernetes/cert-manager-dev.yml
kubectl apply -f infrastructure/kubernetes/config.yml
```

You should now be able to hit https://www.aphiria.com in your browser.  You will get a TLS certificate error since we're using a self-signed certificate locally.  If using Chrome, type in `thisisunsafe` to accept the self-signed certificate.  Likewise, you'll likely have to do the same for the API, which you can do by visiting https://api.aphiria.com/docs/search?query=foo and typing `thisisunsafe`.
