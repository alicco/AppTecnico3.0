const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const models = [
    'C4080',
    'C4070',
    'C4065'
];

const FILE_PATH = 'docs/Codici_C4080_C4070_C4065.xlsx';
const API_URL = 'http://localhost:8000/api/import';
const TEMP_CSV_FILENAME = 'temp_import.csv';

async function run() {
    try {
        console.log(`Reading file: ${FILE_PATH}`);
        if (!fs.existsSync(FILE_PATH)) {
            throw new Error(`File not found: ${FILE_PATH}`);
        }

        const workbook = XLSX.readFile(FILE_PATH);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        let rows = XLSX.utils.sheet_to_json(sheet); // Array of objects

        console.log(`Total raw rows: ${rows.length}`);

        // Clean Data
        console.log("Cleaning data (removing asterisks from Codes)...");
        rows = rows.map(row => {
            if (row.Code && typeof row.Code === 'string') {
                row.Code = row.Code.replace(/\*/g, '').trim();
            }
            return row;
        });

        // Create CSV
        const newSheet = XLSX.utils.json_to_sheet(rows);
        const csvData = XLSX.utils.sheet_to_csv(newSheet);

        // Save to temp file with absolute path
        const absTempPath = path.resolve(TEMP_CSV_FILENAME);
        fs.writeFileSync(absTempPath, csvData);
        console.log(`Saved temp CSV to ${absTempPath}`);

        for (const model of models) {
            console.log(`\nImporting for model: ${model}...`);

            // Escape model name for shell
            const modelParam = model.replace(/"/g, '\\"');
            // Path is absolute, but safe to quote
            const fileParam = absTempPath.replace(/"/g, '\\"');

            // Use -F "file=@PATH"
            const curlCmd = `curl -X POST -F "model=${modelParam}" -F "file=@${fileParam}" "${API_URL}"`;

            // console.log(`Running: ${curlCmd}`); 

            await new Promise((resolve, reject) => {
                exec(curlCmd, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`[ERROR] Curl failed for ${model}:`, error);
                        // Don't reject, just continue to try others? Or fail hard?
                        // User needs all 3. I'll log and continue.
                        resolve();
                        return;
                    }
                    console.log(`[SUCCESS] Output for ${model}:`, stdout);
                    resolve();
                });
            });
        }

        // Cleanup
        // fs.unlinkSync(absTempPath); 
        console.log("\nDone.");

    } catch (e) {
        console.error("Critical Error:", e);
    }
}

run();
