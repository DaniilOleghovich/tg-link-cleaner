import { pool } from '../pool.js';

export async function isDomainWhitelisted(chatId, domain) {
    const { rows } = await pool.query(
        SELECT 1 FROM whitelist_domains WHERE chat_id = $1 AND domain = $2,
        [chatId, domain]
);
    return rows.length > 0;
}

export async function isUserWhitelisted(chatId, userId) {
    const { rows } = await pool.query(
        SELECT 1 FROM whitelist_users WHERE chat_id = $1 AND user_id = $2,
        [chatId, userId]
);
    return rows.length > 0;
}

export async function addWhitelistDomain(chatId, domain) {
    await pool.query(
        `INSERT INTO whitelist_domains (chat_id, domain) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
        [chatId, domain]
    );
}