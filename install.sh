# NOTE: Keep these version in sync with the ones used by GitHub Actions
cd /tmp

# Install Kubectl (https://kubernetes.io/docs/tasks/tools)
echo "Installing Kubectl"
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
kubectl version

# Install Minikube (https://minikube.sigs.k8s.io/docs/start/)
echo "Installing Minikube"
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube && rm minikube-linux-amd64
minikube version

# Install Helm (https://helm.sh/docs/intro/install/)
echo "Installing Helm"
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh
helm version

# Install Helmfile (https://helmfile.readthedocs.io/en/latest/#installation)
echo "Installing Helmfile"
curl -L https://github.com/helmfile/helmfile/releases/download/v1.0.0-rc.7/helmfile_1.0.0-rc.7_linux_amd64.tar.gz -o helmfile.tar.gz
tar -xzf helmfile.tar.gz
sudo mv helmfile /usr/local/bin/helmfile
helmfile --version

# Install Terraform (https://developer.hashicorp.com/terraform/install)
echo "Installing Terraform"
curl -lO https://releases.hashicorp.com/terraform/1.9.8/terraform_1.9.8_linux_amd64.zip
sudo unzip terraform_1.9.8_linux_amd64.zip -d /usr/local/bin
terraform --version
