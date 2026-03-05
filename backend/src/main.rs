use axum::{
    routing::{get, post},
    extract::DefaultBodyLimit,
    Router,
};
use lambda_http::run;
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod handlers;
mod models;

use std::collections::HashSet;

pub struct AppState {
    pub db: sqlx::PgPool,
    pub priority_parts: HashSet<String>,
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
    let pool = match PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await {
            Ok(pool) => {
                tracing::info!("✅ Successfully connected to database");
                pool
            },
            Err(e) => {
                tracing::error!("❌ CRITICAL ERROR: Failed to connect to Postgres. URL: {}. Error: {}", database_url, e);
                panic!("Database connection failed");
            }
        };

    // Migration - Enable pg_trgm extension for fuzzy text matching
    sqlx::query(r#"CREATE EXTENSION IF NOT EXISTS pg_trgm;"#)
        .execute(&pool)
        .await
        .expect("Failed to enable pg_trgm extension");

    // Migration
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS dip_switches (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            model_name TEXT NOT NULL,
            switch_number INTEGER NOT NULL,
            bit_number INTEGER NOT NULL,
            function_name TEXT,
            setting_0 TEXT,
            setting_1 TEXT,
            default_val TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    "#)
    .execute(&pool)
    .await
    .expect("Failed to run migration");

    // Add faulty_part_isolation column if not exists
    let _ = sqlx::query("ALTER TABLE error_codes ADD COLUMN IF NOT EXISTS faulty_part_isolation TEXT")
        .execute(&pool)
        .await;

    // CLEANUP: Deduplicate printers (Merge Konica Minolta variants -> Short names)
    tracing::info!("Running printer deduplication...");
    let _ = sqlx::query(r#"
        -- 1. Ensure short entries exist
        INSERT INTO printers (id, model_name) 
        VALUES (gen_random_uuid(), 'C4080'), (gen_random_uuid(), 'C4070'), (gen_random_uuid(), 'C4065')
        ON CONFLICT (model_name) DO NOTHING;

        -- 2. Move errors from long names/variants to short names
        -- Matches 'Konica Minolta C4080', 'KonicaMinolta C4080', etc.
        UPDATE error_codes ec
        SET printer_id = target.id
        FROM printers source
        JOIN printers target ON target.model_name = 
            TRIM(REPLACE(REPLACE(source.model_name, 'Konica Minolta', ''), 'KonicaMinolta', ''))
        WHERE ec.printer_id = source.id 
        AND (source.model_name LIKE 'Konica Minolta %' OR source.model_name LIKE 'KonicaMinolta%')
        AND target.model_name IN ('C4080', 'C4070', 'C4065');

        -- 3. Delete long name entries
        DELETE FROM printers 
        WHERE model_name LIKE 'Konica Minolta %' 
           OR model_name LIKE 'KonicaMinolta%';
    "#)
    .execute(&pool)
    .await;
    tracing::info!("Printer deduplication finished.");

    // Redis Removed per user request

    // Load Priority Parts
    let priority_parts_path = "priority_parts.json";
    let priority_string = std::fs::read_to_string(priority_parts_path).unwrap_or_else(|_| "[]".to_string());
    let priority_list: Vec<String> = serde_json::from_str(&priority_string).unwrap_or_default();
    let priority_set: std::collections::HashSet<String> = priority_list.into_iter().collect();

    let state = Arc::new(AppState {
        db: pool,
        priority_parts: priority_set,
    });

    let app = Router::new()
        .route("/api/health", get(|| async { "OK" }))
        .route("/api/printers", get(handlers::get_printers))
        .route("/api/errors", get(handlers::search_errors))
        .route("/api/import", post(handlers::import_data))
        .route("/api/import-dipsw", post(handlers::import_dipsw))
        .route("/api/dipswitches", get(handlers::get_dipswitches))
        .route("/api/parts", get(handlers::search_parts))
        .route("/api/parts/sections", get(handlers::get_model_sections))
        .route("/api/maintenance", get(handlers::get_maintenance_parts))
        .layer(DefaultBodyLimit::max(50 * 1024 * 1024)) // 50MB limit
        .layer(CorsLayer::permissive())
        .with_state(state);

    let is_lambda = std::env::var("AWS_LAMBDA_RUNTIME_API").is_ok();

    if is_lambda {
        tracing::info!("Starting in AWS Lambda environment");
        run(app).await.unwrap();
    } else {
        let port = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8000);
        let addr = SocketAddr::from(([0, 0, 0, 0], port));

        tracing::info!("listening on {}", addr);
        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app).await.unwrap();
    }
}
