
const axios = require('axios');

async function test(q) {
    try {
        const res = await axios.get(`http://localhost:8000/api/parts?q=${encodeURIComponent(q)}`);
        console.log(`Query: "${q}" -> Results: ${res.data.length}`);
        if (res.data.length > 0) {
            console.log(`   Sample: ${res.data[0].part_code} - ${res.data[0].name}`);
        }
    } catch (e) {
        console.error(`Query: "${q}" -> Failed: ${e.message}`);
    }
}

async function run() {
    console.log('--- Testing Backend Search Patterns ---');
    await test('A0V');          // Code prefix
    await test('a0v');          // Case insensitive code
    await test('A0VDM50500');   // Full code
    await test('Thermistor');   // Description (exact case)
    await test('thermistor');   // Description (lowercase)
    await test('Termistore');   // Italian (should fail unless in DB)
    await test('ROLLER');       // Common part
    await test('roller');       // Case insensitive part
}

run();
