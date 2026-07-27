CREATE TABLE IF NOT EXISTS link_violations (
    id SERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    violated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_violations_chat_user ON
    link_violations (chat_id, user_id, violated_at);