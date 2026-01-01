use sqlx::postgres::PgPoolOptions;
use std::env;
use dotenvy::dotenv;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    
    println!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    println!("Identifying and deleting duplicates...");

    // Logic: Delete rows where code has asterisk IF a non-asterisk version exists for same printer
    // We assume asterisk is a suffix or part of string. REPLACE checks strictly.
    // "3501*" -> replace -> "3501". If "3501" exists, delete "3501*".
    
    let query = r#"
        DELETE FROM error_codes e1 
        WHERE code LIKE '%*%' 
        AND EXISTS (
            SELECT 1 FROM error_codes e2 
            WHERE e2.printer_id = e1.printer_id 
            AND e2.code = REPLACE(e1.code, '*', '')
        )
    "#;

    let result = sqlx::query(query)
        .execute(&pool)
        .await?;

    println!("Success! Deleted {} duplicate rows with asterisks.", result.rows_affected());
    
    Ok(())
}
