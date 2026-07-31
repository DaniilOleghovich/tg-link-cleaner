const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут
const cache = new Map(); // chatId -> { admins: Set<userId>, usernames: Set<string>, cachedAt: number }

export async function getCachedAdmins(ctx, chatId) {
    const cached = cache.get(chatId);
    const now = Date.now();

    if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
        return cached;
    }

    const members = await ctx.api.getChatAdministrators(chatId);

    const admins = new Set();
    const usernames = new Set();

    for (const m of members) {
        admins.add(m.user.id);
        if (m.user.username) {
            usernames.add(m.user.username.toLowerCase());
        }
    }

    const data = { admins, usernames, cachedAt: now };
    cache.set(chatId, data);
    return data;
}

export function invalidateAdminCache(chatId) {
    cache.delete(chatId);
}