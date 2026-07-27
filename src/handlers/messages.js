import { getChatSettings, ensureChat } from '../db/repositories/chats.js';
import { isDomainWhitelisted, isUserWhitelisted } from '../db/repositories/whitelist.js';
import { extractLinks, getDomain } from '../utils/link-detector.js';

const WARNING_LIFETIME_MS = 12000; // 12 секунд

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
            return;
        }

        await sendAutoDeleteWarning(ctx, userId);
        return;
    }
}

async function sendAutoDeleteWarning(ctx, userId) {
    try {
        const warning = await ctx.reply(
            `${nameOrMention(ctx.from)}, отправлять ссылки в этом чате запрещено.`,
            { reply_parameters: undefined } // сообщение уже удалено, на что отвечать — нет смысла
    );

        setTimeout(async () => {
            try {
                await ctx.api.deleteMessage(ctx.chat.id, warning.message_id);
            } catch (err) {
                // сообщение могло быть уже удалено вручную — не страшно
                console.error('Не удалось удалить предупреждение:', err.message);
            }
        }, WARNING_LIFETIME_MS);
    } catch (err) {
        console.error('Не удалось отправить предупреждение:', err.message);
    }
}

function nameOrMention(user) {
    return user.username ? `@${user.username}` : user.first_name;
}