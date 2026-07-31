export function extractLinks(message) {
    const entities = message.entities ?? [];
    const text = message.text ?? '';
    const links = [];

    for (const e of entities) {
        if (e.type === 'url') {
            links.push(text.slice(e.offset, e.offset + e.length));
        } else if (e.type === 'text_link') {
            links.push(e.url);
        } else if (e.type === 'mention') {
            links.push(text.slice(e.offset, e.offset + e.length)); // @username
        }
    }
    return links;
}

export function getDomain(url) {
    try {
        const normalized = url.startsWith('http') ? url : 'https:'//${url};
        return new URL(normalized).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

export function extractMentionUsernames(message) {
    const entities = message.entities ?? [];
    const text = message.text ?? '';
    const usernames = [];

    for (const e of entities) {
        if (e.type === 'mention') {
            // текст вида "@username" — убираем @
            const raw = text.slice(e.offset, e.offset + e.length);
            usernames.push(raw.replace('@', '').toLowerCase());
        } else if (e.type === 'text_link' || e.type === 'url') {
            const url = e.type === 'text_link' ? e.url : text.slice(e.offset, e.offset + e.length);
            const match = url.match(/t\.me\/([a-zA-Z0-9_]+)/);
            if (match) {
                usernames.push(match[1].toLowerCase());
            }
        }
    }

    return usernames;
}