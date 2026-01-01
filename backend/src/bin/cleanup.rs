use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    let database_url = std::env::var("DATABASE_URL")?;
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await?;

    println!("Connected to database.");

    // 1. Ensure short names exist
    let models = ["C4080", "C4070", "C4065"];
    for m in &models {
        sqlx::query("INSERT INTO printers (id, model_name) VALUES ($1, $2) ON CONFLICT (model_name) DO NOTHING")
            .bind(Uuid::new_v4())
            .bind(m)
            .execute(&pool)
            .await?;
        println!("Checked printer: {}", m);
    }

    // 2. Fetch all printers to get IDs
    let printers: Vec<(Uuid, String)> = sqlx::query_as("SELECT id, model_name FROM printers")
        .fetch_all(&pool)
        .await?;

    let mut short_map = std::collections::HashMap::new();
    for (id, name) in &printers {
        if models.contains(&name.as_str()) {
            short_map.insert(name.clone(), *id);
        }
    }

    // 3. Find and Merge duplicates
    for (id, name) in &printers {
        let normalized = name
            .replace("Konica Minolta ", "")
            .replace("KonicaMinolta ", "")
            .replace("Konica Minolta", "")
            .replace("KonicaMinolta", "")
            .trim()
            .to_string();

        if name != &normalized && models.contains(&normalized.as_str()) {
            let target_id = short_map.get(&normalized).unwrap();
            println!("Merging {} ({}) -> {} ({})", name, id, normalized, target_id);

            // Move errors
            let moved = sqlx::query("UPDATE error_codes SET printer_id = $1 WHERE printer_id = $2")
                .bind(target_id)
                .bind(id)
                .execute(&pool)
                .await?;
            println!("Moved {} error codes.", moved.rows_affected());

            // Delete bad printer
            sqlx::query("DELETE FROM printers WHERE id = $1")
                .bind(id)
                .execute(&pool)
                .await?;
            println!("Deleted old printer entry.");
        }
    }

    // 4. Check a known error code
    let check: Option<(String, Option<String>)> = sqlx::query_as("SELECT code, faulty_part_isolation FROM error_codes WHERE code ILIKE 'C-0101' LIMIT 1")
        .fetch_optional(&pool)
        .await?;
    
    if let Some((code, isolation)) = check {
        println!("Verification: Code {} has isolation: {:?}", code, isolation);
    } else {
        println!("Verification: C-0101 not found.");
    }

    println!("Cleanup finished.");
    Ok(())
}
