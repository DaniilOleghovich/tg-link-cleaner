import { pool } from '../pool.js';

export async function addOwnerChannel(chatId, username) {
    await pool.query(
        `INSERT INTO owner_channels (chat_id, channel_username) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
        [chatId, username.toLowerCase()]
    );
}

export async function removeOwnerChannel(chatId, username) {
    await pool.query(
        `DELETE FROM owner_channels WHERE chat_id = $1 AND channel_username = $2`,
        [chatId, username.toLowerCase()]
    );
}

export async function listOwnerChannels(chatId) {
    const { rows } = await pool.query(
        `SELECT channel_username FROM owner_channels WHERE chat_id = $1 ORDER BY channel_username`,
        [chatId]
    );
    return rows.map(r => r.channel_username);
}

export async function isOwnerChannel(chatId, username) {
    const { rows } = await pool.query(
        `SELECT 1 FROM owner_channels WHERE chat_id = $1 AND channel_username = $2`,
        [chatId, username.toLowerCase()]
    );
    return rows.length > 0;
}