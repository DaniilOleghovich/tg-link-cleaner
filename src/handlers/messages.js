import { getChatSettings, ensureChat } from '../db/repositories/chats.js';
import { isDomainWhitelisted } from '../db/repositories/whitelist.js';
import { listOwnerChannels } from '../db/repositories/ownerChannels.js';
import { extractLinks, getDomain } from '../utils/link-detector.js';
import { checkIsAdminOrCreator } from '../utils/permissions.js';
import { recordViolation, countRecentViolations, clearViolations } from '../db/repositories/violations.js';

const WARNING_LIFETIME_MS = 12000;
const VIOLATION_WINDOW_MINUTES = 10;
const VIOLATIONS_BEFORE_MUTE = 3;

export async function handleMessage(ctx) {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    await ensureChat(chatId);
    const settings = await getChatSettings(chatId);
    if (!settings?.filter_enabled) return;

    if (await checkIsAdminOrCreator(ctx, userId)) return;

    const links = extractLinks(ctx.message);
    if (links.length === 0) return;

    const ownerChannels = new Set(await listOwnerChannels(chatId));

    for (const link of links) {
        const isAllowed = await isLinkAllowed(link, chatId, ownerChannels);
        if (isAllowed) continue;

        try {
            await ctx.deleteMessage();
        } catch (err) {
            console.error('Не удалось удалить сообщение:', err.message);
            return;
        }

        await recordViolation(chatId, userId);
        const violations = await countRecentViolations(chatId, userId, VIOLATION_WINDOW_MINUTES);

        if (violations >= VIOLATIONS_BEFORE_MUTE) {
            await muteUser(ctx, userId);
        } else {
            await sendAutoDeleteWarning(ctx, violations);
        }

        return;
    }
}

async function isLinkAllowed(link, chatId, ownerChannels) {
    // Случай 1: голое упоминание вида @username (entity типа mention без t.me/ в тексте)
    if (link.startsWith('@')) {
        const username = link.slice(1).toLowerCase();
        return ownerChannels.has(username);
    }

    const domain = getDomain(link);

    // Случай 2: ссылка на t.me/telegram.me — проверяем через список разрешённых каналов
    if (domain === 't.me' || domain === 'telegram.me') {
        const tMeMatch = link.match(/t(?:elegram)?\.me\/([a-zA-Z0-9_]+)/i);
        const username = tMeMatch ? tMeMatch[1].toLowerCase() : null;
        return username ? ownerChannels.has(username) : false;
    }

    // Случай 3: обычная внешняя ссылка — проверяем через доменный вайтлист
    if (domain) {
        return isDomainWhitelisted(chatId, domain);
    }

    return false;
}

async function muteUser(ctx, userId) {
    try {
        await ctx.api.restrictChatMember(
            ctx.chat.id,
            userId,
            {
                can_send_messages: false,
                can_send_audios: false,
                can_send_documents: false,
                can_send_photos: false,
                can_send_videos: false,
                can_send_video_notes: false,
                can_send_voice_notes: false,
                can_send_polls: false,
                can_send_other_messages: false,
                can_add_web_page_previews: false,
            }
            // until_date не передаём — мут бессрочный
        );

        await clearViolations(ctx.chat.id, userId);

        await ctx.reply(
            `${nameOrMention(ctx.from)} получил перманентный мут за повторную отправку ссылок. Снять может только администратор вручную.`
        );
    } catch (err) {
        console.error('Не удалось замьютить пользователя:', err.message);
    }
}

async function sendAutoDeleteWarning(ctx, violations) {
    try {
        const warning = await ctx.reply(
            `${nameOrMention(ctx.from)}, отправлять ссылки в этом чате запрещено. ` +
            `Нарушение ${violations}/${VIOLATIONS_BEFORE_MUTE} — при следующем будет мут.`
        );

        setTimeout(async () => {
            try {
                await ctx.api.deleteMessage(ctx.chat.id, warning.message_id);
            } catch (err) {
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