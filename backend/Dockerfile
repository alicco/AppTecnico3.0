FROM rust:slim-bookworm as chef
RUN apt-get update && apt-get install -y pkg-config libssl-dev
RUN cargo install cargo-chef
WORKDIR /app

FROM chef as planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef as builder
COPY --from=planner /app/recipe.json recipe.json
# Build dependencies - this is the caching Docker layer!
RUN cargo chef cook --release --recipe-path recipe.json
# Build application
COPY . .
RUN cargo build --release --bin backend

FROM debian:bookworm-slim AS runtime
WORKDIR /app
# Install OpenSSL/Ca-Certificates dependencies ensuring native-tls works
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    # Clean up
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/backend /usr/local/bin/backend
EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/backend"]
