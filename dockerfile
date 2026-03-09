# --- Stage 1: Build Stage ---
FROM rust:1.80-slim-bookworm as builder

# 1. Install required system libraries
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    build-essential \
    g++ \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Setup a stable Compile-Time Database
# We use /tmp/build.db to ensure an absolute path for SQLx macros
ENV DATABASE_URL=sqlite:///tmp/build.db
RUN touch /tmp/build.db

# 3. Copy project files
COPY . .

# 4. Seed the compile-time database with the full schema
# SQLx macro verification requires tables to exist at build time
RUN sqlite3 /tmp/build.db < app/app_storage/database/schema.sql

# 5. Build the binary
RUN cargo build --release --bin app_ui

# --- Stage 2: Runtime Stage ---
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/app_ui ./agentic-hub

# Copy the frontend folder
COPY frontend/ ./frontend/

# Ensure runtime data directory exists
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["./agentic-hub"]