
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually to be safe
const envPath = path.join(__dirname, 'frontend', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

console.log('Testing with URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const query = 'A0V';
    console.log(`Searching for "${query}" in manual_spare_parts...`);

    // Test 1: Simple select
    let { data: t1, error: e1 } = await supabase.from('manual_spare_parts').select('part_code').limit(1);
    if (e1) console.error('Test 1 failed:', e1);
    else console.log('Test 1 (connect) success, found columns:', Object.keys(t1[0]));

    // Test 2: .ilike() single column
    let { data: t2, error: e2 } = await supabase.from('manual_spare_parts')
        .select('*')
        .ilike('part_code', `%${query}%`)
        .limit(5);
    if (e2) console.error('Test 2 failed:', e2);
    else console.log(`Test 2 (.ilike) success, found ${t2.length} results`);

    // Test 3: .or() with *
    let { data: t3, error: e3 } = await supabase.from('manual_spare_parts')
        .select('*')
        .or(`part_code.ilike.*${query}*,name.ilike.*${query}*`)
        .limit(5);
    if (e3) console.error('Test 3 failed:', e3);
    else console.log(`Test 3 (.or *) success, found ${t3.length} results`);

    // Test 4: .or() with %
    let { data: t4, error: e4 } = await supabase.from('manual_spare_parts')
        .select('*')
        .or(`part_code.ilike.%${query}%,name.ilike.%${query}%`)
        .limit(5);
    if (e4) console.error('Test 4 failed:', e4);
    else console.log(`Test 4 (.or %) success, found ${t4.length} results`);
}

test();
