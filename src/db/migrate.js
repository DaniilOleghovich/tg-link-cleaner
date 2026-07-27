import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, 'migrations');

const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

try {
    for (const file of files) {
        const sql = readFileSync(join(migrationsDir, file), 'utf-8');
        console.log(`Применяю миграцию: ${file}`);
        await pool.query(sql);
    }
    console.log('Все миграции применены успешно');
} catch (err) {
    console.error('Ошибка миграции:', err);
} finally {
    await pool.end();
}