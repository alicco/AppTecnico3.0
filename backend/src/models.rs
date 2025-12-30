use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Serialize, Deserialize, FromRow, Debug)]
pub struct Printer {
    pub id: Uuid,
    pub model_name: String,
}

#[derive(Serialize, Deserialize, FromRow, Debug)]
pub struct SparePart {
    pub id: Uuid,
    pub oem_code: String,
    pub description: String,
    pub image_url: Option<String>,
    pub ranking: i32,
}

#[derive(Serialize, Deserialize, FromRow, Debug)]
pub struct ErrorCode {
    pub id: Uuid,
    pub printer_id: Uuid,
    pub code: String,
    pub classification: Option<String>,
    pub cause: Option<String>,
    pub measures: Option<String>,
    pub solution: Option<String>,
    pub estimated_abnormal_parts: Option<String>,
    pub correction: Option<String>,
    pub note: Option<String>,
    #[sqlx(skip)]
    pub parts: Vec<SparePart>,
}

#[derive(Deserialize, Debug)]
pub struct ImportRow {
    pub Code: String,
    pub Classification: Option<String>,
    pub Cause: Option<String>,
    #[serde(rename = "Measures to take when an alert occurs")]
    pub Measures: Option<String>,
    pub Solution: Option<String>,
    #[serde(rename = "Estimated abnormal parts")]
    pub EstimatedParts: Option<String>,
    pub Correction: Option<String>,
    pub Note: Option<String>,
}
