
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'frontend', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const query = 'A0V';

    // Test: .ilike()
    console.log('--- TEST 1: .ilike() ---');
    let { data, error } = await supabase.from('manual_spare_parts').select('*').ilike('part_code', `%${query}%`).limit(1);
    if (error) {
        console.log('ERROR:', JSON.stringify(error));
    } else {
        console.log('SUCCESS! Found:', data.length);
    }

    // Test: .or()
    console.log('--- TEST 2: .or() ---');
    let { data: d2, error: e2 } = await supabase.from('manual_spare_parts')
        .select('*')
        .or(`part_code.ilike.*${query}*,name.ilike.*${query}*`)
        .limit(1);
    if (e2) {
        console.log('ERROR:', JSON.stringify(e2));
    } else {
        console.log('SUCCESS! Found:', d2.length);
    }
}

test();
