use axum::{
    extract::{Query, State},
    Json,
};
use std::sync::Arc;
use crate::{AppState, models::{Printer, ErrorCode, SparePart}};
use serde::Deserialize;
use sqlx::types::Uuid;

#[derive(Deserialize)]
pub struct SearchParams {
    model: String,
    code: Option<String>,
}

pub async fn get_printers(State(state): State<Arc<AppState>>) -> Json<Vec<Printer>> {
    let printers = sqlx::query_as::<_, Printer>("SELECT * FROM printers ORDER BY model_name")
        .fetch_all(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch printers: {:?}", e);
            e
        })
        .unwrap_or_default();
    
    Json(printers)
}

pub async fn search_errors(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SearchParams>,
) -> Json<Vec<ErrorCode>> {
    let mut sql = String::from(r#"
        SELECT e.* FROM error_codes e
        JOIN printers p ON e.printer_id = p.id
        WHERE p.model_name = $1
    "#);

    if let Some(ref c) = params.code {
        // Normalize DB column: remove hyphens and spaces
        sql.push_str(" AND REPLACE(REPLACE(e.code, '-', ''), ' ', '') ILIKE $2");
    }
    
    sql.push_str(" LIMIT 50");

    let query = sqlx::query_as::<_, ErrorCode>(&sql)
        .bind(&params.model);
    
    let query = if let Some(ref c) = params.code {
        // Normalize Input: remove hyphens and spaces, wrap in wildcards
        let clean_code = c.replace('-', "").replace(' ', "");
        query.bind(format!("%{}%", clean_code))
    } else {
        query
    };

    let mut errors = query.fetch_all(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to search errors: {:?}", e);
            e
        })
        .unwrap_or_default();

    // Population of parts (N+1 query, simple for now)
    for error in &mut errors {
        let parts = sqlx::query_as::<_, SparePart>(r#"
            SELECT sp.*, ep.ranking as ranking FROM spare_parts sp
            JOIN error_parts ep ON sp.id = ep.part_id
            WHERE ep.error_id = $1
            ORDER BY ep.ranking ASC
        "#)
        .bind(error.id)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();
        
        error.parts = parts;
    }

    Json(errors)
}
use axum::extract::Multipart;
use std::io::Cursor;
use calamine::{Reader, Xlsx};

pub async fn import_data(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Json<serde_json::Value> {
    let mut model = String::new();
    let mut success_count = 0;
    
    // We need to buffer the file data because we process fields in order
    let mut file_data: Option<Vec<u8>> = None;

    while let Some(field) = multipart.next_field().await.unwrap() {
        let name = field.name().unwrap().to_string();
        
        if name == "model" {
            model = field.text().await.unwrap();
        } else if name == "file" {
            file_data = Some(field.bytes().await.unwrap().to_vec());
        }
    }

    if model.is_empty() {
         return Json(serde_json::json!({ "success": false, "message": "Model name is required" }));
    }

    if let Some(bytes) = file_data {
        // 1. Get or Create Printer
        let printer = sqlx::query_as::<_, Printer>("SELECT * FROM printers WHERE model_name = $1")
            .bind(&model)
            .fetch_optional(&state.db)
            .await
            .unwrap();

        let printer_id = if let Some(p) = printer {
            p.id
        } else {
             let row: (Uuid,) = sqlx::query_as("INSERT INTO printers (model_name) VALUES ($1) RETURNING id")
                .bind(&model)
                .fetch_one(&state.db)
                .await
                .unwrap();
            row.0
        };

        // 2. Parse CSV
        let cursor = Cursor::new(bytes);
        let mut rdr = csv::ReaderBuilder::new()
            .has_headers(true)
            .flexible(true) // Allow variable fields just in case
            .from_reader(cursor);

        for result in rdr.deserialize() {
            let record: crate::models::ImportRow = match result {
                Ok(r) => r,
                Err(e) => {
                    tracing::error!("CSV Parse Error: {:?}", e);
                    continue;
                }
            };

            // 3. Insert Error Code (Upsert based on printer_id + code)
            // Note: We leave estimated_abnormal_parts as the raw string for now
            let _ = sqlx::query(r#"
                INSERT INTO error_codes (
                    printer_id, code, classification, cause, measures, solution, 
                    estimated_abnormal_parts, correction, note
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (printer_id, code) DO UPDATE SET
                    classification = EXCLUDED.classification,
                    cause = EXCLUDED.cause,
                    measures = EXCLUDED.measures,
                    solution = EXCLUDED.solution,
                    estimated_abnormal_parts = EXCLUDED.estimated_abnormal_parts,
                    correction = EXCLUDED.correction,
                    note = EXCLUDED.note
            "#)
            .bind(printer_id)
            .bind(record.Code)
            .bind(record.Classification)
            .bind(record.Cause)
            .bind(record.Measures)
            .bind(record.Solution)
            .bind(record.EstimatedParts)
            .bind(record.Correction)
            .bind(record.Note)
            .execute(&state.db)
            .await;

            success_count += 1;
        }
    }

    Json(serde_json::json!({ "success": true, "message": format!("Imported {} error codes for {}", success_count, model) }))
}

