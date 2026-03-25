
require('dotenv').config();
const { pool } = require('./db-neon-fixed');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const sqlitePath = path.join(__dirname, '..', 'shared', 'shared_data', 'administrative_divisions.db');

async function importAdministrativeData() {
    console.log('--- IMPORTANDO DIVISÃO ADMINISTRATIVA PARA NEON ---');
    
    if (!fs.existsSync(sqlitePath)) {
        console.error(`❌ Arquivo SQLite não encontrado em: ${sqlitePath}`);
        process.exit(1);
    }

    const db = new sqlite3.Database(sqlitePath);
    const pgClient = await pool.connect();

    try {
        await pgClient.query('BEGIN');

        // Limpar tabelas geográficas para evitar duplicatas se necessário, ou usar ON CONFLICT
        // Vamos usar uma abordagem de "UPSERT" ou verificar existia para ser seguro.

        // 1. Obter Províncias
        const provincias = await new Promise((resolve, reject) => {
            db.all("SELECT id, nome FROM administrative_divisions WHERE tipo = 'provincia'", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📌 Processando ${provincias.length} províncias...`);
        const provincialMap = new Map(); // sqlite_id -> pg_uuid

        for (const p of provincias) {
            const res = await pgClient.query(
                'INSERT INTO public.provincias (nome, codigo) VALUES ($1, $2) ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id',
                [p.nome, p.id]
            );
            provincialMap.set(p.id, res.rows[0].id);
        }

        // 2. Obter Distritos
        const distritos = await new Promise((resolve, reject) => {
            db.all("SELECT id, nome, parent_id FROM administrative_divisions WHERE tipo = 'distrito'", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📌 Processando ${distritos.length} distritos...`);
        const distritoMap = new Map();

        for (const d of distritos) {
            const pgProvId = provincialMap.get(d.parent_id);
            if (pgProvId) {
                const res = await pgClient.query(
                    'INSERT INTO public.distritos (provincia_id, nome, codigo) VALUES ($1, $2, $3) ON CONFLICT (provincia_id, nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id',
                    [pgProvId, d.nome, d.id]
                );
                distritoMap.set(d.id, res.rows[0].id);
            }
        }

        // 3. Obter Postos Administrativos
        const postos = await new Promise((resolve, reject) => {
            db.all("SELECT id, nome, parent_id FROM administrative_divisions WHERE tipo = 'posto'", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📌 Processando ${postos.length} postos administrativos...`);
        const postoMap = new Map();

        for (const pa of postos) {
            const pgDistId = distritoMap.get(pa.parent_id);
            if (pgDistId) {
                const res = await pgClient.query(
                    'INSERT INTO public.postos_administrativos (distrito_id, nome) VALUES ($1, $2) ON CONFLICT (distrito_id, nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id',
                    [pgDistId, pa.nome]
                );
                postoMap.set(pa.id, res.rows[0].id);
            }
        }

        // 4. Obter Localidades
        const localidades = await new Promise((resolve, reject) => {
            db.all("SELECT id, nome, parent_id FROM administrative_divisions WHERE tipo = 'localidade'", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📌 Processando ${localidades.length} localidades...`);

        for (const l of localidades) {
            const pgPostoId = postoMap.get(l.parent_id);
            if (pgPostoId) {
                await pgClient.query(
                    'INSERT INTO public.localidades (posto_id, nome) VALUES ($1, $2) ON CONFLICT (posto_id, nome) DO UPDATE SET nome = EXCLUDED.nome',
                    [pgPostoId, l.nome]
                );
            }
        }

        await pgClient.query('COMMIT');
        console.log('✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!');

    } catch (err) {
        await pgClient.query('ROLLBACK');
        console.error('❌ ERRO NA IMPORTAÇÃO:', err);
    } finally {
        pgClient.release();
        db.close();
        process.exit(0);
    }
}

importAdministrativeData();
