.PHONY: help install lint fmt test test-unit test-integration build ci check clean dev docker-build docker-run all

NPM ?= npm
DOCKER_COMPOSE ?= docker compose

.DEFAULT_GOAL := help

help:
	@echo "Synk — React + PocketBase scaffold"
	@echo ""
	@echo "install            Install frontend dependencies (npm)"
	@echo "dev                Vite dev server (frontend)"
	@echo "lint               ESLint (frontend)"
	@echo "fmt                Prettier format (frontend)"
	@echo "test               Unit tests (Vitest)"
	@echo "test-unit          Same as test"
	@echo "test-integration   Placeholder (no suite yet)"
	@echo "build              Typecheck + Vite production build"
	@echo "ci / check         fmt, lint, test, build"
	@echo "clean              Remove frontend build output"
	@echo "docker-run         Start PocketBase via compose (pocketbase/)"
	@echo "all                PocketBase + Vite dev server (parallel)"

install:
	cd frontend && $(NPM) install

lint:
	cd frontend && $(NPM) run lint

fmt:
	cd frontend && $(NPM) run fmt

test:
	cd frontend && $(NPM) run test

test-unit:
	cd frontend && $(NPM) run test-unit

test-integration:
	cd frontend && $(NPM) run test-integration

build:
	cd frontend && $(NPM) run build

ci: fmt lint test build
check: ci

clean:
	rm -rf frontend/dist

dev:
	cd frontend && $(NPM) run dev

docker-build:
	@echo "PocketBase image is pulled on first compose up; no separate image build."
	@cd pocketbase && $(DOCKER_COMPOSE) pull

docker-run:
	cd pocketbase && $(DOCKER_COMPOSE) up

# Run API + UI together (two jobs; Ctrl+C stops both).
all:
	@$(MAKE) -j2 docker-run dev
