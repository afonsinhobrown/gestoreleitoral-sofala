const { pool } = require('./db-neon-fixed');

async function checkGeo() {
    try {
        console.log('--- CHECKING NIASSA GEO DATA ---');
        const provRes = await pool.query("SELECT id, nome FROM public.provincias WHERE nome ILIKE '%niassa%'");
        if (provRes.rows.length === 0) {
            console.log('❌ Niassa not found in provincias table.');
            const allProvs = await pool.query("SELECT nome FROM public.provincias");
            console.log('Available provinces:', allProvs.rows.map(p => p.nome).join(', '));
        } else {
            const niassaId = provRes.rows[0].id;
            console.log(`✅ Niassa found (ID: ${niassaId})`);
            const distRes = await pool.query("SELECT id, nome FROM public.distritos WHERE provincia_id = $1", [niassaId]);
            console.log(`📊 Total districts for Niassa: ${distRes.rows.length}`);
            if (distRes.rows.length > 0) {
                console.table(distRes.rows);
            } else {
                console.log('⚠️ No districts for Niassa in the database!');
            }
        }
    } catch (err) {
        console.error('❌ Error checking geo data:', err.message);
    } finally {
        await pool.end();
    }
}

checkGeo();
