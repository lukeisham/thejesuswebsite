# --- Stage 1: Planner ---
FROM lukemathwalker/cargo-chef:latest-rust-1.85.0-bookworm AS planner
WORKDIR /app
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# --- Stage 2: Cacher ---
FROM lukemathwalker/cargo-chef:latest-rust-1.85.0-bookworm AS cacher
WORKDIR /app
COPY --from=planner /app/recipe.json recipe.json
# Build dependencies - this is the layer that saves you 10+ minutes per build
RUN cargo chef cook --release --recipe-path recipe.json

# --- Stage 3: Builder ---
FROM rust:1.85.0-bookworm AS builder
WORKDIR /app
COPY . .
# Copy over the pre-compiled dependencies from the cacher
COPY --from=cacher /app/target target
COPY --from=cacher /usr/local/cargo /usr/local/cargo
# Build the specific binary for your UI/Server
RUN cargo build --release -p app_ui

# --- Stage 4: Runtime ---
# Using Debian Bookworm Slim for a small footprint but with necessary GLIBC support for 'candle'
FROM debian:bookworm-slim AS runtime
WORKDIR /app

# Install OpenSSL and CA-certificates (needed for OpenAI/API calls)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy the binary from the builder
COPY --from=builder /app/target/release/app_ui /usr/local/bin/app_ui

# Copy frontend static assets and config
COPY --from=builder /app/frontend/static ./frontend/static
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/openai.yml ./openai.yml

# Set environment variables
ENV RUST_LOG=info
ENV APP_ENVIRONMENT=production

# Expose the port your server.rs likely listens on
EXPOSE 8080

# Run the app
ENTRYPOINT ["/usr/local/bin/app_ui"]