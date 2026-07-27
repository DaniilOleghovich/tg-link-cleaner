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
        const normalized = url.startsWith('http') ? url : https://${url};
        return new URL(normalized).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}