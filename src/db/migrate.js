import { readFileSync } from 'fs';
import { pool } from './pool.js';

const sql = readFileSync(new URL('./migrations/001_init.sql', import.meta.url), 'utf-8');

try {
    await pool.query(sql);
    console.log('Миграция применена успешно');
} catch (err) {
    console.error('Ошибка миграции:', err);
} finally {
    await pool.end();
}