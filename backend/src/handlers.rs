use axum::{
    extract::{Query, State, Multipart},
    response::IntoResponse,
    Json,
};
use std::sync::Arc;
use crate::{AppState, models::{Printer, ErrorCode, SparePart}};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow};
use std::io::Cursor;
use calamine::{Reader, Xlsx};

#[derive(Deserialize)]
pub struct SearchParams {
    model: String,
    code: Option<String>,
    limit: Option<i32>,
    summary: Option<String>,
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

    let is_numeric_search = if let Some(ref c) = params.code {
        c.chars().all(|x| x.is_numeric() || x.is_whitespace() || x == '-')
    } else {
        false
    };

    if let Some(ref _c) = params.code {
        if is_numeric_search {
            // Smart Starts With (Numeric)
            sql.push_str(" AND regexp_replace(e.code, '[^0-9]', '', 'g') LIKE $2");
        } else {
             // Smart Starts With (Alphanumeric)
             sql.push_str(" AND REPLACE(REPLACE(e.code, '-', ''), ' ', '') ILIKE $2");
        }
    }
    
    // Check if summary mode is requested (string "1" or "true")
    let is_summary = params.summary.as_deref().map(|s| s == "1" || s == "true").unwrap_or(false);

    // Only apply limit if NOT fetching summary (or explicitly set)
    if let Some(l) = params.limit {
        sql.push_str(&format!(" LIMIT {}", l));
    } else if !is_summary {
         sql.push_str(" LIMIT 50");
    }

    let query = sqlx::query_as::<_, ErrorCode>(&sql)
        .bind(&params.model);
    
    let query = if let Some(ref c) = params.code {
        if is_numeric_search {
            // Bind: "24%"
            let clean_nums: String = c.chars().filter(|x| x.is_numeric()).collect();
            query.bind(format!("{}%", clean_nums))
        } else {
             // Bind: "C2%" (Implicitly starts with)
             let clean_code = c.replace('-', "").replace(' ', "");
             query.bind(format!("{}%", clean_code))
        }
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

    // Skip parts population if summary is requested
    if !is_summary {
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
    }

    Json(errors)
}

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
        // 1. Get or Create Printer (Normalize name to remove Konica Minolta prefix variants)
        let normalized_model = model
            .replace("Konica Minolta ", "")
            .replace("KonicaMinolta ", "")
            .replace("Konica Minolta", "")
            .replace("KonicaMinolta", "")
            .trim()
            .to_string();
        let printer = sqlx::query_as::<_, Printer>("SELECT * FROM printers WHERE model_name = $1")
            .bind(&normalized_model)
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

        for result in rdr.deserialize::<std::collections::HashMap<String, String>>() {
            let record = match result {
                Ok(r) => r,
                Err(e) => {
                    tracing::error!("CSV Parse Error: {:?}", e);
                    continue;
                }
            };

            if success_count == 0 {
                let keys: Vec<_> = record.keys().collect();
                tracing::info!("CSV Record Keys: {:?}", keys);
            }

            let code = record.get("Code").cloned().unwrap_or_default();
            // Try different variants just in case
            let isolation = record.get("Faulty part isolation DIPSW")
                .or_else(|| record.get("Faulty part isolation DIPSW ")) 
                .or_else(|| record.get("Faulty part isolation"))
                .cloned();

            let query_res = sqlx::query(r#"
                INSERT INTO error_codes (
                    printer_id, code, classification, cause, measures, solution, 
                    estimated_abnormal_parts, correction, faulty_part_isolation, note
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (printer_id, code) DO UPDATE SET
                    classification = EXCLUDED.classification,
                    cause = EXCLUDED.cause,
                    measures = EXCLUDED.measures,
                    solution = EXCLUDED.solution,
                    estimated_abnormal_parts = EXCLUDED.estimated_abnormal_parts,
                    correction = EXCLUDED.correction,
                    faulty_part_isolation = EXCLUDED.faulty_part_isolation,
                    note = EXCLUDED.note
            "#)
            .bind(printer_id)
            .bind(&code)
            .bind(record.get("Classification"))
            .bind(record.get("Cause"))
            .bind(record.get("Measures to take when an alert occurs"))
            .bind(record.get("Solution"))
            .bind(record.get("Estimated abnormal parts"))
            .bind(record.get("Correction"))
            .bind(&isolation)
            .bind(record.get("Note"))
            .execute(&state.db)
            .await;

            match query_res {
                Ok(res) => {
                    success_count += 1;
                    if code == "C-0101" {
                        tracing::info!("C-0101 DB Update Success. Rows affected: {}. Bound Isolation: {:?}", res.rows_affected(), isolation);
                    }
                },
                Err(e) => tracing::error!("Database Error during import for {}: {:?}", code, e),
            }
        }
    }

    Json(serde_json::json!({ "success": true, "message": format!("Imported {} error codes for {}", success_count, model) }))
}

#[derive(Deserialize)]
pub struct DipSwitchImport {
    pub model_name: String,
    pub switch_number: i32,
    pub bit_number: i32,
    pub function_name: Option<String>,
    pub setting_0: Option<String>,
    pub setting_1: Option<String>,
    pub default_val: Option<String>,
}

pub async fn import_dipsw(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Vec<DipSwitchImport>>,
) -> impl IntoResponse {
    let mut tx = state.db.begin().await.unwrap();
    
    // Normalize model name from the first item if available
    if let Some(first) = payload.first() {
        let normalized_model = first.model_name.replace("Konica Minolta ", "").replace("KonicaMinolta", "").trim().to_string();
        
        // Clear existing switches for this model to prevent duplicates
        sqlx::query("DELETE FROM dip_switches WHERE model_name = $1")
            .bind(&normalized_model)
            .execute(&mut *tx)
            .await
            .unwrap();

        for item in payload {
            sqlx::query(r#"
                INSERT INTO dip_switches (model_name, switch_number, bit_number, function_name, setting_0, setting_1, default_val)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#)
            .bind(&normalized_model)
            .bind(item.switch_number)
            .bind(item.bit_number)
            .bind(&item.function_name)
            .bind(&item.setting_0)
            .bind(&item.setting_1)
            .bind(&item.default_val)
            .execute(&mut *tx)
            .await
            .unwrap();
        }
    }
    
    tx.commit().await.unwrap();
    Json("Imported")
}

#[derive(Deserialize)]
pub struct DipSwitchParams {
    pub model: Option<String>,
    pub switch: Option<i32>,
    pub bit: Option<i32>,
}

pub async fn get_dipswitches(
    State(state): State<Arc<AppState>>,
    Query(params): Query<DipSwitchParams>,
) -> Json<Vec<crate::models::DipSwitch>> {
    let mut sql = String::from("SELECT * FROM dip_switches WHERE 1=1");
    let mut query_model = None;
    
    if let Some(model) = &params.model {
        let normalized = model.replace("Konica Minolta ", "").replace("KonicaMinolta", "").trim().to_string();
        sql.push_str(" AND model_name = $1");
        query_model = Some(normalized);
    }
    
    if let Some(sw) = params.switch {
        sql.push_str(&format!(" AND switch_number = {}", sw));
    }
    
    if let Some(bit) = params.bit {
        sql.push_str(&format!(" AND bit_number = {}", bit));
    }
    
    sql.push_str(" ORDER BY switch_number ASC, bit_number ASC");
    
    let mut query = sqlx::query_as::<_, crate::models::DipSwitch>(&sql);
    
    if let Some(m) = &query_model {
        query = query.bind(m);
    }
    
    let switches = query
        .fetch_all(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch dipswitches: {:?}", e);
            e
        })
        .unwrap_or_default();
        
    Json(switches)
}

#[derive(Deserialize)]
pub struct SearchPartsParams {
    pub model: Option<String>,
    pub q: Option<String>,
    pub section: Option<String>,
    pub limit: Option<i32>,
    #[serde(default)]
    pub fuzzy: bool,
}

fn get_equivalent_models(model: &str) -> Vec<String> {
    let m = model.to_uppercase();
    // Normalize: Remove "Konica Minolta" etc
    let clean = m.replace("KONICA MINOLTA ", "").replace("KONICAMINOLTA ", "").trim().to_string();

    let mut models = vec![clean.clone()];

    // Equivalency Logic
    // C4080 Group
    if clean == "C4065" || clean == "C4070" || clean == "C4080" {
        if clean != "C4080" { models.push("C4080".to_string()); }
        if clean != "C4070" { models.push("C4070".to_string()); }
        if clean != "C4065" { models.push("C4065".to_string()); }
    }
    // C7100 Group
    else if clean == "C7090" || clean == "C7100" {
        if clean != "C7100" { models.push("C7100".to_string()); }
        if clean != "C7090" { models.push("C7090".to_string()); }
    }
    // C12000 Group
    else if clean == "C14000" || clean == "C12000" {
         if clean != "C12000" { models.push("C12000".to_string()); }
         if clean != "C14000" { models.push("C14000".to_string()); }
    }
    // C6100 Group
    else if clean == "C6085" || clean == "C6100" {
        if clean != "C6100" { models.push("C6100".to_string()); }
        if clean != "C6085" { models.push("C6085".to_string()); }
    }
    // C12010 Group
    else if clean == "C14010" || clean == "C10500" || clean == "C12010" {
        if clean != "C12010" { models.push("C12010".to_string()); }
        if clean != "C14010" { models.push("C14010".to_string()); }
        if clean != "C10500" { models.push("C10500".to_string()); }
    }
    // C5080 Group (C5080 is main for C5070 and C5065 ? Assuming C5080 exists in DB)
    else if clean == "C5070" || clean == "C5065" || clean == "C5080" {
         if clean != "C5080" { models.push("C5080".to_string()); }
         if clean != "C5070" { models.push("C5070".to_string()); }
         if clean != "C5065" { models.push("C5065".to_string()); }
    }

    models
}

#[derive(Serialize, FromRow)]
pub struct SectionRow {
    pub section_name: String,
}

pub async fn get_model_sections(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SearchPartsParams>,
) -> Json<Vec<String>> {
    let model_str = params.model.unwrap_or_default();
    if model_str.is_empty() {
        return Json(vec![]);
    }
    let models = get_equivalent_models(&model_str);
    let sql = "SELECT DISTINCT section_name FROM manual_spare_parts WHERE UPPER(model) = ANY($1) ORDER BY section_name";
    
    let sections = sqlx::query_as::<_, SectionRow>(sql)
        .bind(&models)
        .fetch_all(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch sections: {:?}", e);
            e
        })
        .unwrap_or_default()
        .into_iter()
        .map(|r| r.section_name)
        .collect();
        
    Json(sections)
}

pub async fn search_parts(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SearchPartsParams>,
) -> Json<Vec<crate::models::ManualSparePart>> {
    
    let mut sql = String::from(r#"
        SELECT 
            model, 
            section_name, 
            page_number, 
            ref_number, 
            part_code, 
            name, 
            quantity,
            NULL::real as similarity
        FROM manual_spare_parts 
        WHERE 1=1
    "#);
    
    let mut args_count = 0;
    let mut query_q_code = String::new(); // for part_code prefix match
    let mut query_q_name = String::new(); // for name contains match
    let mut models_vec: Vec<String> = vec![];

    // MODEL FILTER (Optional)
    if let Some(ref m) = params.model {
        if !m.is_empty() {
            models_vec = get_equivalent_models(m);
            args_count += 1;
            sql.push_str(&format!(" AND UPPER(model) = ANY(${})", args_count));
        }
    }

    // SECTION FILTER
    if let Some(ref section) = params.section {
        if !section.is_empty() {
            args_count += 1;
            sql.push_str(&format!(" AND LOWER(section_name) = LOWER(${})", args_count));
        }
    }

    // TEXT SEARCH - prefix on part_code OR contains on name
    if let Some(ref q) = params.q {
        if !q.trim().is_empty() {
            let trimmed = q.trim();
            query_q_code = format!("{}%", trimmed.to_uppercase());
            query_q_name = format!("%{}%", trimmed);
            args_count += 1;
            let code_arg = args_count;
            args_count += 1;
            let name_arg = args_count;
            sql.push_str(&format!(
                " AND (part_code ILIKE ${} OR name ILIKE ${})",
                code_arg, name_arg
            ));
        }
    }

    sql.push_str(" ORDER BY part_code ASC");

    let limit = params.limit.unwrap_or(500); // Higher limit for section views
    args_count += 1;
    sql.push_str(&format!(" LIMIT ${}", args_count));

    let mut query = sqlx::query_as::<_, crate::models::ManualSparePart>(&sql);

    tracing::info!("Final Search SQL: {}", sql);

    // Bind model filter if present
    if !models_vec.is_empty() {
        tracing::info!("Binding models: {:?}", models_vec);
        query = query.bind(&models_vec);
    }

    if let Some(ref section) = params.section {
        if !section.is_empty() {
            tracing::info!("Binding section: {}", section);
            query = query.bind(section);
        }
    }

    if let Some(ref q) = params.q {
        if !q.trim().is_empty() {
            let trimmed = q.trim();
            let debug_code = format!("{}%", trimmed.to_uppercase());
            let debug_name = format!("%{}%", trimmed);
            tracing::info!("Binding q variants: code='{}', name='{}'", debug_code, debug_name);
            query = query.bind(debug_code);
            query = query.bind(debug_name);
        }
    }

    tracing::info!("Binding limit: {}", limit);
    query = query.bind(limit);

    let mut parts = query
        .fetch_all(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to search parts: {:?}", e);
            e
        })
        .unwrap_or_default();
    
    // Sort by Priority
    parts.sort_by(|a, b| {
        let a_prio = state.priority_parts.contains(&a.part_code);
        let b_prio = state.priority_parts.contains(&b.part_code);
        b_prio.cmp(&a_prio) // Priority first
    });

    Json(parts)
}

// Maintenance Parts Endpoint
#[derive(Serialize, Deserialize)]
pub struct MaintenanceSection {
    pub name: String,
    pub items: Vec<MaintenanceItem>,
}

#[derive(Serialize, Deserialize)]
pub struct MaintenanceItem {
    pub code: String,
    pub name: String,
    pub qty: String,
    pub life: String,
    pub page_key: String,
}

pub async fn get_maintenance_parts(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<MaintenanceSection>> {
    // Read the maintenance.json file (relative to working directory)
    let json_path = "maintenance.json";
    let json_content = match std::fs::read_to_string(json_path) {
        Ok(content) => content,
        Err(e) => {
            tracing::error!("Failed to read maintenance.json from path '{}': {:?}", json_path, e);
            return Json(vec![]);
        }
    };
    
    let sections: Vec<MaintenanceSection> = match serde_json::from_str(&json_content) {
        Ok(s) => s,
        Err(_) => return Json(vec![]),
    };
    
    // Extract all codes
    let mut all_codes: Vec<String> = vec![];
    for section in &sections {
        for item in &section.items {
            all_codes.push(item.code.clone());
        }
    }
    
    // Query DB for these codes
    let query = format!(
        "SELECT part_code, model, section_name, page_number, ref_number, name, quantity 
         FROM manual_spare_parts 
         WHERE part_code = ANY($1)"
    );
    
    let db_parts: Vec<crate::models::ManualSparePart> = sqlx::query_as(&query)
        .bind(&all_codes)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();
    
    // Build a map for quick lookup
    use std::collections::HashMap;
    let mut db_map: HashMap<String, crate::models::ManualSparePart> = HashMap::new();
    for part in db_parts {
        db_map.insert(part.part_code.clone(), part);
    }
    
    // Enrich sections with DB data
    let mut enriched_sections = vec![];
    for section in sections {
        let mut enriched_items = vec![];
        for item in section.items {
            // Check if we have DB data for this code
            if let Some(db_part) = db_map.get(&item.code) {
                // Use DB data (more accurate)
                enriched_items.push(MaintenanceItem {
                    code: db_part.part_code.clone(),
                    name: db_part.name.clone(),
                    qty: item.qty, // Keep maintenance qty (usage qty)
                    life: item.life, // Keep life from Excel
                    page_key: format!("{}-{}", db_part.page_number, db_part.ref_number),
                });
            } else {
                // Keep original if not in DB
                enriched_items.push(item);
            }
        }
        
        enriched_sections.push(MaintenanceSection {
            name: section.name,
            items: enriched_items,
        });
    }
    
    Json(enriched_sections)
}
