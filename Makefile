# Makefile for Aphiria.com Development

SHELL := /bin/bash
.ONESHELL:
.SHELLFLAGS := -euo pipefail -c
MAKEFLAGS += --no-builtin-rules
.SUFFIXES:
.DEFAULT_GOAL := help

.PHONY: help install build docs images minikube-images \
	minikube-start minikube-tunnel minikube-stop minikube-dashboard minikube-redeploy-apps \
	db-seed \
	up destroy preview refresh \
	test test-ts test-php test-e2e-install test-e2e-local test-e2e-preview test-e2e-production \
	format format-ts format-php format-check format-check-ts format-check-php \
	lint lint-ts lint-php quality-gates \
	web-dev

# Configuration
STACK ?= local
NAMESPACE ?= default
KUBECTL_ARGS ?= -n $(NAMESPACE)
PULUMI_ARGS ?=
INSTALL_ARGS ?=
BASE_IMAGE := aphiria.com-base:latest
BUILD_IMAGE := aphiria.com-build:latest
API_IMAGE := aphiria.com-api:latest
WEB_IMAGE := aphiria.com-web:latest

help: ## Show available commands
	@grep -E '^[a-zA-Z0-9_.-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

## Setup

install: ## Install system dependencies and project dependencies (INSTALL_ARGS=...)
	./install.sh $(INSTALL_ARGS)
	npm ci
	cd apps/api && composer install --no-interaction && composer dump-autoload -o

## Database

db-seed: ## Run database migrations and seed data
	cd apps/api && vendor/bin/phinx migrate && vendor/bin/phinx seed:run

## Development

web-dev: ## Run Next.js dev server (standalone, no API)
	npm run dev

## Build

build: ## Build project (use PROJECT=web|pulumi|build-docs to build specific project, or omit for all)
ifdef PROJECT
ifeq ($(PROJECT),web)
	npm run build --workspace=apps/web
else ifeq ($(PROJECT),pulumi)
	npm run build --workspace=infrastructure/pulumi
else ifeq ($(PROJECT),build-docs)
	npm run build --workspace=tools/build-docs
else
	@echo "❌ Unknown PROJECT: $(PROJECT)"
	@echo "   Valid values: web, pulumi, build-docs"
	@exit 1
endif
else
	npm run build
endif

docs: ## Build documentation (generate HTML from Markdown)
	npm run build:docs

## Docker

images: ## Build all Docker images (for CI/registry workflows)
	docker build -t $(BASE_IMAGE) -f ./infrastructure/docker/base/Dockerfile .
	docker build -t $(BUILD_IMAGE) -f ./infrastructure/docker/build/Dockerfile . --build-arg BASE_IMAGE=$(BASE_IMAGE)
	docker build -t $(API_IMAGE) -f ./infrastructure/docker/runtime/api/Dockerfile . --build-arg BASE_IMAGE=$(BASE_IMAGE) --build-arg BUILD_IMAGE=$(BUILD_IMAGE)
	docker build -t $(WEB_IMAGE) -f ./infrastructure/docker/runtime/web/Dockerfile . --build-arg BUILD_IMAGE=$(BUILD_IMAGE)

minikube-images: ## Build all Docker images in minikube's Docker daemon (for local dev)
	@eval "$$(minikube -p minikube docker-env)" && $(MAKE) images

## Formatting

format: format-ts format-php ## Format all code

format-check: format-check-ts format-check-php ## Check code formatting

format-check-php: ## Check PHP formatting
	cd apps/api && composer phpcs-test

format-check-ts: ## Check TypeScript formatting
	npm run format:check

format-php: ## Format PHP code
	cd apps/api && composer phpcs-fix

format-ts: ## Format TypeScript code
	npm run format

## Linting & Static Analysis

lint: lint-ts lint-php ## Run all linters

lint-php: ## Run PHP static analysis
	cd apps/api && composer psalm

lint-ts: ## Lint TypeScript code
	npm run lint

quality-gates: lint format-check test ## Run all quality checks (CI equivalent)

## Minikube

minikube-dashboard: ## Open Kubernetes dashboard
	minikube dashboard

minikube-redeploy-apps: minikube-images ## Rebuild app images and restart app deployments (NAMESPACE=default)
	kubectl $(KUBECTL_ARGS) rollout restart deployment api
	kubectl $(KUBECTL_ARGS) rollout restart deployment web

minikube-start: ## Start minikube with metrics-server addon
	minikube start
	minikube addons enable metrics-server
	@echo "\n⚠️  Run 'make minikube-tunnel' in a separate terminal"

minikube-stop: ## Stop minikube
	minikube stop

minikube-tunnel: ## Run minikube tunnel (requires sudo, long-running - use separate terminal)
	@echo "⚠️  This is a long-running foreground process. Keep this terminal open."
	@echo "⚠️  You will be prompted for your sudo password."
	@echo ""
	minikube tunnel

## Infrastructure

up: ## Build images and deploy infrastructure (STACK=local, PULUMI_ARGS=...)
ifeq ($(STACK),local)
	$(MAKE) minikube-images
else
	$(MAKE) images
endif
	$(MAKE) build PROJECT=pulumi
	cd infrastructure/pulumi && pulumi up --stack $(STACK) $(PULUMI_ARGS)

destroy: ## Destroy infrastructure (STACK=local, requires CONFIRM=yes, PULUMI_ARGS=...)
	@if [ "$(CONFIRM)" != "yes" ]; then \
		echo "❌ Refusing to destroy infrastructure without confirmation."; \
		echo "   This is a destructive operation. Re-run with CONFIRM=yes"; \
		echo ""; \
		echo "   Example: make destroy CONFIRM=yes"; \
		echo "   Example: make destroy STACK=preview-pr-123 CONFIRM=yes"; \
		exit 1; \
	fi
	@echo "⚠️  Destroying STACK=$(STACK)"
	$(MAKE) build PROJECT=pulumi
	cd infrastructure/pulumi && pulumi destroy --stack $(STACK) $(PULUMI_ARGS)

preview: ## Preview infrastructure changes (STACK=local, PULUMI_ARGS=...)
	$(MAKE) build PROJECT=pulumi
	cd infrastructure/pulumi && pulumi preview --stack $(STACK) $(PULUMI_ARGS)

refresh: ## Sync Pulumi state with cluster (STACK=local, PULUMI_ARGS=...)
	$(MAKE) build PROJECT=pulumi
	cd infrastructure/pulumi && pulumi refresh --stack $(STACK) $(PULUMI_ARGS)

## Testing

test: test-ts test-php ## Run all tests

test-e2e-install: ## Install Playwright browsers and dependencies
	cd tests/e2e && \
	npx playwright install --with-deps chromium webkit

test-e2e-local: ## Run E2E tests against local minikube
	cd tests/e2e && \
	test -f .env || cp .env.dist .env && \
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

test-php: ## Run PHP tests
	cd apps/api && composer phpunit

test-ts: ## Run TypeScript tests (use PROJECT=web|pulumi|build-docs to test specific project, or omit for all)
ifdef PROJECT
	$(MAKE) build PROJECT=$(PROJECT)
ifeq ($(PROJECT),web)
	npm test --workspace=apps/web
else ifeq ($(PROJECT),pulumi)
	npm test --workspace=infrastructure/pulumi
else ifeq ($(PROJECT),build-docs)
	npm test --workspace=tools/build-docs
else
	@echo "❌ Unknown PROJECT: $(PROJECT)"
	@echo "   Valid values: web, pulumi, build-docs"
	@exit 1
endif
else
	$(MAKE) build
	npm test
endif
