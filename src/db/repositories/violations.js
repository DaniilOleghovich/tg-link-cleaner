import { pool } from '../pool.js';

export async function recordViolation(chatId, userId) {
    await pool.query(
        `INSERT INTO link_violations (chat_id, user_id) VALUES ($1, $2)`,
        [chatId, userId]
);
}

export async function countRecentViolations(chatId, userId, windowMinutes = 10) {
    const { rows } = await pool.query(
        `SELECT COUNT(*) FROM link_violations
     WHERE chat_id = $1 AND user_id = $2
       AND violated_at > now() - ($3 || ' minutes')::interval`,
        [chatId, userId, windowMinutes]
    );
    return parseInt(rows[0].count, 10);
}