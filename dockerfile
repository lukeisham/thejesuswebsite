# --- Stage 1: Build Stage ---
FROM rust:1.80-slim-bookworm as builder

# 1. Install required system libraries for building (OpenSSL, C++ for dependencies)
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    build-essential \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 2. Setup the Compile-Time Database URL (Fixes the SQLx error)
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

WORKDIR /app

# 3. Copy your project files
COPY . .

# 4. Build the binary
RUN cargo build --release --bin app_ui

# --- Stage 2: Runtime Stage ---
FROM debian:bookworm-slim

# 1. Install runtime dependencies only (keeps image small)
RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Copy ONLY the server binary from the builder stage
COPY --from=builder /app/target/release/app_ui ./agentic-hub

# 3. Copy the frontend folder (HTML/JS/CSS)
COPY frontend/ ./frontend/

# 4. Create data directory for SQLite (if needed at runtime)
RUN mkdir -p /app/data

EXPOSE 3000

# 5. Launch the application
CMD ["./agentic-hub"]