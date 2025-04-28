#!/bin/bash

# Default values
install_kubectl=false
install_minikube=false
install_helm=false
install_helmfile=false
install_terraform=false
install_doctl=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --install-kubectl)
            install_kubectl=true
            ;;
        --install-minikube)
            install_minikube=true
            ;;
        --install-helm)
            install_helm=true
            ;;
        --install-helmfile)
            install_helmfile=true
            ;;
        --install-terraform)
            install_terraform=true
            ;;
        --install-doctl)
            install_doctl=true
            ;;
        *)
            # If any other argument is passed, do nothing
            ;;
    esac
done

# Check if no arguments are passed, which we'll interpret as "install everything"
if [ $# -eq 0 ]; then
    install_kubectl=true
    install_minikube=true
    install_helm=true
    install_helmfile=true
    install_terraform=true
    install_doctl=true
fi

original_dir=$(pwd)
cd /tmp

if [ "$install_kubectl" = true ]; then
    echo "Installing kubectl (https://kubernetes.io/docs/tasks/tools)"
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
    kubectl version
fi

if [ "$install_minikube" = true ]; then
    echo "Installing Minikube (https://minikube.sigs.k8s.io/docs/start/)"
    curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
    sudo install minikube-linux-amd64 /usr/local/bin/minikube && rm minikube-linux-amd64
    minikube version
fi

if [ "$install_helm" = true ]; then
    echo "Installing Helm (https://helm.sh/docs/intro/install/)"
    curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
    chmod 700 get_helm.sh
    ./get_helm.sh
    helm version
fi

if [ "$install_helmfile" = true ]; then
    echo "Installing Helmfile (https://helmfile.readthedocs.io/en/latest/#installation)"
    curl -L https://github.com/helmfile/helmfile/releases/download/v1.0.0-rc.12/helmfile_1.0.0-rc.12_linux_amd64.tar.gz -o helmfile.tar.gz
    tar -xzf helmfile.tar.gz
    sudo mv helmfile /usr/local/bin/helmfile
    helmfile --version
fi

if [ "$install_terraform" = true ]; then
    echo "Installing Terraform (https://developer.hashicorp.com/terraform/install)"
    curl -lO https://releases.hashicorp.com/terraform/1.9.8/terraform_1.9.8_linux_amd64.zip
    sudo unzip -o terraform_1.9.8_linux_amd64.zip -d /usr/local/bin
    terraform --version
fi

if [ "$install_doctl" = true ]; then
    echo "Installing doctl (https://docs.digitalocean.com/reference/doctl/how-to/install/)"
    curl -L https://github.com/digitalocean/doctl/releases/download/v1.117.0/doctl-1.117.0-linux-amd64.tar.gz -o doctl.tar.gz
    tar -xzf doctl.tar.gz
    sudo mv doctl /usr/local/bin
    doctl version
fi

cd "$original_dir"
