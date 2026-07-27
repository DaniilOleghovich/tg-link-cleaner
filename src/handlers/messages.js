import { getChatSettings, ensureChat } from '../db/repositories/chats.js';
import { isDomainWhitelisted, isUserWhitelisted } from '../db/repositories/whitelist.js';
import { extractLinks, getDomain } from '../utils/link-detector.js';

export async function handleMessage(ctx) {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    await ensureChat(chatId);
    const settings = await getChatSettings(chatId);
    if (!settings?.filter_enabled) return;

    if (await isUserWhitelisted(chatId, userId)) return;

    const links = extractLinks(ctx.message);
    if (links.length === 0) return;

    for (const link of links) {
        const domain = getDomain(link);
        if (domain && (await isDomainWhitelisted(chatId, domain))) continue;

        try {
            await ctx.deleteMessage();
        } catch (err) {
            console.error('Не удалось удалить сообщение:', err.message);
        }
        return;
    }
}