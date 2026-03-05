# --- Build Stage ---
FROM rustlang/rust:nightly-slim as builder
WORKDIR /app

# Install dependencies for Rust/OpenSSL/C++
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    build-essential \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY . .

# Build only the main package to be safe
RUN cargo build --release --bin app_ui

# --- Runtime Stage ---
FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy ONLY the server binary and rename it for simplicity
COPY --from=builder /app/target/release/app_ui ./agentic-hub

# Copy the frontend folder (HTML/JS/CSS)
COPY frontend/ ./frontend/

EXPOSE 3000
CMD ["./agentic-hub"]