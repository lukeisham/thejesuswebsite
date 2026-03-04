# The Jesus Website - Developer Makefile

.PHONY: dev check fmt lint test test-unit test-integration build ready docker-up docker-down clean test-wasm build-wasm help

help:
	@echo "Available targets:"
	@echo "  dev               - Run app_ui in debug mode"
	@echo "  check             - Fast workspace-wide type check"
	@echo "  fmt               - Format all code"
	@echo "  lint              - Run Clippy with -D warnings"
	@echo "  test              - Run all workspace tests"
	@echo "  test-unit         - Run only unit tests"
	@echo "  test-integration  - Run integration tests (needs docker-up)"
	@echo "  build             - Build the release binary"
	@echo "  ready             - Pre-push gate: fmt -> lint -> test"
	@echo "  docker-up         - Start ChromaDB and services"
	@echo "  docker-down       - Stop all services"
	@echo "  clean             - Remove target/ and logs"
	@echo "  test-wasm         - Verify core types compile for WASM"
	@echo "  build-wasm        - Build the WASM package for production"

dev:
	cd app && cargo run -p app_ui

check:
	cd app && cargo check --workspace

fmt:
	cd app && cargo fmt --all

lint:
	cd app && cargo clippy --workspace --all-targets --all-features -- -D warnings

test:
	cd app && cargo test --workspace

test-unit:
	cd app && cargo test --workspace --lib --bins

test-integration:
	cd app && cargo test --workspace --test '*'

build:
	cd app && cargo build --release -p app_ui

ready: fmt lint test

docker-up:
	docker compose -f docker.yml up -d

docker-down:
	docker compose -f docker.yml down

clean:
	cd app && cargo clean

test-wasm:
	cd app && cargo check --target wasm32-unknown-unknown

build-wasm:
	cd app && wasm-pack build --target web --out-dir ../frontend/static/js/wasm