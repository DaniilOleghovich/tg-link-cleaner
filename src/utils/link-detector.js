// Извлекает все потенциальные ссылки/упоминания из сообщения:
// - обычный текст (text + entities)
// - подпись к медиа/пересланным историям (caption + caption_entities)
// - ссылка, оставшаяся привязанной к превью, даже если сам текст ссылки удалён
export function extractLinks(message) {
    const links = [];

    const textEntities = message.entities ?? [];
    const text = message.text ?? '';
    for (const e of textEntities) {
        if (e.type === 'url') links.push(text.slice(e.offset, e.offset + e.length));
        else if (e.type === 'text_link') links.push(e.url);
        else if (e.type === 'mention') links.push(text.slice(e.offset, e.offset + e.length));
    }

    const captionEntities = message.caption_entities ?? [];
    const caption = message.caption ?? '';
    for (const e of captionEntities) {
        if (e.type === 'url') links.push(caption.slice(e.offset, e.offset + e.length));
        else if (e.type === 'text_link') links.push(e.url);
        else if (e.type === 'mention') links.push(caption.slice(e.offset, e.offset + e.length));
    }

    // Превью может "пережить" удаление самой ссылки из текста —
    // проверяем это поле отдельно, независимо от entities выше
    if (message.link_preview_options?.url) {
        links.push(message.link_preview_options.url);
    }

    return links;
}

export function getDomain(url) {
    try {
        const normalized = url.startsWith('http') ? url : `https://${url}`;
        return new URL(normalized).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

export function normalizeChannelUsername(input) {
    const trimmed = input.trim();

    const tMeMatch = trimmed.match(/t\.me\/([a-zA-Z0-9_]+)/i);
    if (tMeMatch) {
        return tMeMatch[1].toLowerCase();
    }

    return trimmed.replace('@', '').toLowerCase();
}

export function isValidTelegramUsername(username) {
    if (typeof username !== 'string') return false;

    const clean = username.replace('@', '').trim();

    if (clean.length < 5 || clean.length > 32) return false;
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(clean)) return false;
    if (clean.endsWith('_')) return false;
    if (clean.includes('__')) return false;

    return true;
}