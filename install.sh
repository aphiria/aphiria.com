#!/bin/bash
#
# Install script for Aphiria.com local development dependencies
#
# Usage:
#   ./install.sh                        # Install all dependencies
#   ./install.sh --install-kubectl      # Install specific dependencies
#

# Default values
install_kubectl=false
install_minikube=false
install_pulumi=false
install_nodejs=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --install-kubectl)
            install_kubectl=true
            ;;
        --install-minikube)
            install_minikube=true
            ;;
        --install-pulumi)
            install_pulumi=true
            ;;
        --install-nodejs)
            install_nodejs=true
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Valid options: --install-kubectl, --install-minikube, --install-pulumi, --install-nodejs"
            exit 1
            ;;
    esac
done

# Check if no arguments are passed, which we'll interpret as "install everything"
if [ $# -eq 0 ]; then
    install_kubectl=true
    install_minikube=true
    install_pulumi=true
    install_nodejs=true
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

if [ "$install_pulumi" = true ]; then
    echo "Installing Pulumi (https://www.pulumi.com/docs/install/)"
    curl -fsSL https://get.pulumi.com | sh
    export PATH=$PATH:$HOME/.pulumi/bin
    echo ""
    echo "⚠️  Add Pulumi to your PATH by running:"
    echo "  echo 'export PATH=\$PATH:\$HOME/.pulumi/bin' >> ~/.bashrc && source ~/.bashrc"
    echo "  OR for zsh:"
    echo "  echo 'export PATH=\$PATH:\$HOME/.pulumi/bin' >> ~/.zshrc && source ~/.zshrc"
    pulumi version
fi

if [ "$install_nodejs" = true ]; then
    echo "Installing Node.js 22.x LTS (https://nodejs.org/)"
    # Using NodeSource repository for Ubuntu/Debian
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
    node --version
    npm --version
fi

cd "$original_dir"

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Ensure Docker is installed and running"
echo "  2. Review README.md for more instructions"
