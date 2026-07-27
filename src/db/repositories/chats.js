import { pool } from '../pool.js';

export async function ensureChat(chatId) {
    await pool.query(
        `INSERT INTO chats (chat_id) VALUES ($1)
     ON CONFLICT (chat_id) DO NOTHING`,
        [chatId]
    );
}

export async function getChatSettings(chatId) {
    const { rows } = await pool.query(
        `SELECT * FROM chats WHERE chat_id = $1`,
        [chatId]
);
    return rows[0] ?? null;
}

export async function setFilterEnabled(chatId, enabled) {
    await pool.query(
        `UPDATE chats SET filter_enabled = $2 WHERE chat_id = $1`,
        [chatId, enabled]
);
}