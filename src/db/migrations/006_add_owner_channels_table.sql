CREATE TABLE IF NOT EXISTS owner_channels (
    id SERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    channel_username TEXT NOT NULL,
    UNIQUE (chat_id, channel_username)
);

-- Переносим существующие значения из старого поля, если там что-то было
INSERT INTO owner_channels (chat_id, channel_username)
SELECT chat_id, owner_channel_username FROM chats
WHERE owner_channel_username IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE chats DROP COLUMN IF EXISTS owner_channel_username;