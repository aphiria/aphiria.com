# Makefile for Aphiria.com Development

.PHONY: help install build-images test lint format quality-gates

# Configuration
STACK ?= local
BASE_IMAGE := aphiria.com-base
BUILD_IMAGE := aphiria.com-build
API_IMAGE := aphiria.com-api:latest
WEB_IMAGE := aphiria.com-web:latest
MINIKUBE_DOCKER := eval $$(minikube -p minikube docker-env)

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

## Setup

install: ## Install system dependencies and npm packages
	chmod +x ./install.sh
	./install.sh
	npm install

## Docker

build-images: ## Build all Docker images (base, build, api, web)
	$(MINIKUBE_DOCKER) && \
	docker build -t $(BASE_IMAGE) -f ./infrastructure/docker/base/Dockerfile . && \
	docker build -t $(BUILD_IMAGE) -f ./infrastructure/docker/build/Dockerfile . --build-arg BASE_IMAGE=$(BASE_IMAGE) && \
	docker build -t $(API_IMAGE) -f ./infrastructure/docker/runtime/api/Dockerfile . --build-arg BASE_IMAGE=$(BASE_IMAGE) --build-arg BUILD_IMAGE=$(BUILD_IMAGE) && \
	docker build -t $(WEB_IMAGE) -f ./infrastructure/docker/runtime/web/Dockerfile . --build-arg BUILD_IMAGE=$(BUILD_IMAGE)

## Minikube

minikube-start: ## Start minikube with metrics-server addon
	minikube start
	minikube addons enable metrics-server
	@echo "\n⚠️  Run 'make minikube-tunnel' in a separate terminal"

minikube-tunnel: ## Run minikube tunnel (requires sudo)
	minikube tunnel

minikube-stop: ## Stop minikube
	minikube stop

minikube-dashboard: ## Open Kubernetes dashboard
	minikube dashboard

## Database

db-setup: ## Run database migrations and seed data
	cd apps/api && vendor/bin/phinx migrate && vendor/bin/phinx seed:run

## Pulumi

pulumi-build: ## Build Pulumi TypeScript code
	npm run build --workspace=infrastructure/pulumi

pulumi-preview: pulumi-build ## Preview infrastructure changes (STACK=local)
	cd infrastructure/pulumi && pulumi preview --stack $(STACK)

pulumi-deploy: build-images pulumi-build ## Build images and deploy infrastructure (STACK=local)
	cd infrastructure/pulumi && pulumi up --stack $(STACK)

pulumi-redeploy: build-images ## Rebuild images and restart deployments (STACK=local)
	kubectl rollout restart deployment api
	kubectl rollout restart deployment web

pulumi-destroy: pulumi-build ## Destroy infrastructure (STACK=local)
	cd infrastructure/pulumi && pulumi destroy --stack $(STACK)

pulumi-refresh: pulumi-build ## Sync Pulumi state with cluster (STACK=local)
	cd infrastructure/pulumi && pulumi refresh --stack $(STACK)

## Testing

test: test-ts test-php ## Run all tests

test-ts: ## Run TypeScript tests
	npm run build:docs
	npm run build
	npm test

test-php: ## Run PHP tests
	cd apps/api && composer phpunit

test-e2e-local: ## Run E2E tests against local minikube
	cd tests/e2e && \
	cp .env.dist .env && \
	npx playwright install --with-deps chromium webkit && \
	npm run test:e2e:local

test-e2e-preview: ## Run E2E tests against preview environment (PR=123)
	@if [ -z "$(PR)" ]; then \
		echo "Error: PR number required. Usage: make test-e2e-preview PR=123"; \
		exit 1; \
	fi
	cd tests/e2e && \
	SITE_BASE_URL=https://$(PR).pr.aphiria.com \
	GRAFANA_BASE_URL=https://pr-grafana.aphiria.com \
	COOKIE_DOMAIN=".pr.aphiria.com" \
	npm run test:e2e

test-e2e-production: ## Run E2E tests against production
	cd tests/e2e && \
	SITE_BASE_URL=https://www.aphiria.com \
	GRAFANA_BASE_URL=https://grafana.aphiria.com \
	COOKIE_DOMAIN=".aphiria.com" \
	npm run test:e2e

## Formatting

format: format-ts format-php ## Format all code

format-ts: ## Format TypeScript code
	npm run format

format-php: ## Format PHP code
	cd apps/api && composer phpcs-fix

format-check: format-check-ts format-check-php ## Check code formatting

format-check-ts: ## Check TypeScript formatting
	npm run format:check

format-check-php: ## Check PHP formatting
	cd apps/api && composer phpcs-test

## Linting & Static Analysis

lint: lint-ts lint-php ## Run all linters

lint-ts: ## Lint TypeScript code
	npm run lint

lint-php: ## Run PHP static analysis
	cd apps/api && composer psalm

quality-gates: lint format-check test ## Run all quality checks (CI equivalent)

## Development

web-dev: ## Run Next.js dev server (standalone, no API)
	npm run dev
