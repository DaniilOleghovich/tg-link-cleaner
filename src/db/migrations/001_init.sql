CREATE TABLE IF NOT EXISTS chats (
    chat_id BIGINT PRIMARY KEY,
    filter_enabled BOOLEAN NOT NULL DEFAULT true,
    notify_on_delete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS whitelist_domains (
    id SERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    UNIQUE (chat_id, domain)
    );

CREATE TABLE IF NOT EXISTS whitelist_users (
id SERIAL PRIMARY KEY,
chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    UNIQUE (chat_id, user_id)
    );