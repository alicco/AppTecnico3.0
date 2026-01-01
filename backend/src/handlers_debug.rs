
use axum::Json;

pub async fn debug_simple() -> Json<String> {
    Json("It works!".to_string())
}
