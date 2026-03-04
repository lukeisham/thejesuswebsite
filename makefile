# Variables
CARGO := cargo
DOCKER := docker-compose -f docker.yml
BINARY_NAME := app_ui
LOG_DIR := ./logs

# Phony targets ensure make doesn't confuse commands with files
.PHONY: all help dev build test lint clean docker-up docker-down fmt

# Default target: show help
all: help

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Development:"
	@echo "  dev          Run the main UI application"
	@echo "  check        Fast check of the codebase"
	@echo "  fmt          Format code using rustfmt.toml"
	@echo "  lint         Run clippy with strict denials"
	@echo ""
	@echo "Testing & Building:"
	@echo "  test         Run all workspace tests"
	@echo "  build        Build the release binary"
	@echo ""
	@echo "Infrastructure:"
	@echo "  docker-up    Start services (Chroma, etc.)"
	@echo "  docker-down  Stop all services"
	@echo ""
	@echo "Maintenance:"
	@echo "  clean        Remove target dir and logs"

# --- Development ---

dev:
	$(CARGO) run -p app_ui

check:
	$(CARGO) check --workspace

fmt:
	$(CARGO) fmt --all

lint:
	$(CARGO) clippy --workspace -- -D warnings

# --- Quality Gate (Run this before pushing) ---
ready: fmt lint test
	@echo "✅ Workspace is ready for a commit!"

# --- Build & Test ---

build:
	$(CARGO) build --release

build-wasm:
	wasm-pack build app/app_core --target web --out-dir ../../frontend/js/pkg

test:
	$(CARGO) test --workspace

# --- Infrastructure & Docker ---

docker-up:
	$(DOCKER) up -d

docker-down:
	$(DOCKER) down

# --- Cleanup ---

clean:
	$(CARGO) clean
	rm -rf $(LOG_DIR)
	@echo "🧹 Cleaned target and logs."