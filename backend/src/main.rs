use axum::{
    routing::{get, post},
    extract::DefaultBodyLimit,
    Router,
};
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod handlers;
mod models;

pub struct AppState {
    pub db: sqlx::PgPool,
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "backend=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set").trim().to_string();

    // Database Setup
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to Postgres");

    // Redis Removed per user request

    let state = Arc::new(AppState {
        db: pool,
    });

    let app = Router::new()
        .route("/api/health", get(|| async { "OK" }))
        .route("/api/printers", get(handlers::get_printers))
        .route("/api/errors", get(handlers::search_errors))
        .route("/api/import", post(handlers::import_data))
        .layer(DefaultBodyLimit::max(50 * 1024 * 1024)) // 50MB limit
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8000));
    tracing::info!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
