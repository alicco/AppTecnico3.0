const { Client } = require('pg');
const DATABASE_URL = "postgresql://postgres.sitxqsefkuaovgqunawa:4275142Ss.!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres";

async function normalize() {
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    try {
        const res = await client.query(`
            UPDATE dip_switches 
            SET model_name = TRIM(REPLACE(REPLACE(model_name, 'Konica Minolta', ''), 'KonicaMinolta', '')) 
            WHERE model_name LIKE 'Konica Minolta %' OR model_name LIKE 'KonicaMinolta%'
        `);
        console.log(`Normalized ${res.rowCount} dip switch entries.`);

        const check = await client.query("SELECT DISTINCT model_name FROM dip_switches");
        console.log("Current models in dip_switches:", check.rows.map(r => r.model_name));

    } catch (e) {
        console.error("Normalization failed:", e);
    } finally {
        await client.end();
    }
}

normalize().catch(console.error);
