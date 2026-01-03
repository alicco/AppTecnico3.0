const XLSX = require('xlsx');
const { Client } = require('pg');

const DATABASE_URL = "postgresql://postgres.sitxqsefkuaovgqunawa:4275142Ss.!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres";
const FILE_PATH = 'docs/Codici_C4080_C4070_C4065.xlsx';
const MODELS = ['C4080', 'C4070', 'C4065'];

async function sync() {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(`Read ${rows.length} rows from Excel.`);

    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    console.log("Connected to DB.");

    try {
        await client.query("BEGIN;");

        for (const modelName of MODELS) {
            console.log(`Processing Model: ${modelName}...`);

            // Get printer ID
            const pRes = await client.query("SELECT id FROM printers WHERE model_name = $1", [modelName]);
            if (pRes.rows.length === 0) {
                console.error(`Printer ${modelName} not found. Skipping.`);
                continue;
            }
            const printerId = pRes.rows[0].id;

            let count = 0;
            for (const row of rows) {
                const code = String(row.Code || '').replace(/\*/g, '').trim();
                if (!code) continue;

                const isolation = row['Faulty part isolation DIPSW'] || null;

                await client.query(`
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
                `, [
                    printerId,
                    code,
                    row.Classification || null,
                    row.Cause || null,
                    row['Measures to take when an alert occurs'] || null,
                    row.Solution || null,
                    row['Estimated abnormal parts'] || null,
                    row.Correction || null,
                    isolation,
                    row.Note || null
                ]);
                count++;
            }
            console.log(`Synced ${count} codes for ${modelName}.`);
        }

        await client.query("COMMIT;");
        console.log("SUCCESS: All models synced.");

    } catch (e) {
        await client.query("ROLLBACK;");
        console.error("SYNC FAILED:", e.message);
    } finally {
        await client.end();
    }
}

sync().catch(console.error);
