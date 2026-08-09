import { getChatSettings, ensureChat } from '../db/repositories/chats.js';
import { isDomainWhitelisted } from '../db/repositories/whitelist.js';
import { listOwnerChannels } from '../db/repositories/ownerChannels.js';
import { extractLinks, getDomain } from '../utils/link-detector.js';
import { checkIsAdminOrCreator } from '../utils/permissions.js';
import { getCachedAdmins } from '../utils/adminCache.js';
import { recordViolation, countRecentViolations, clearViolations } from '../db/repositories/violations.js';

const WARNING_LIFETIME_MS = 12000;
const VIOLATION_WINDOW_MINUTES = 10;
const VIOLATIONS_BEFORE_MUTE = 3;

// Используется и для новых сообщений (message), и для отредактированных
// (edited_message) — ссылка/превью может быть добавлена или изменена
// уже после отправки исходного сообщения
export async function handleMessage(ctx) {
    const chatId = ctx.chat.id;
    const userId = ctx.from?.id;

    // Защита от сбоя, если у сообщения нет обычного отправителя
    // (например, анонимный админ или служебные сообщения)
    if (!userId) {
        console.warn('Сообщение без ctx.from, пропускаю:', JSON.stringify(ctx.message, null, 2));
        return;
    }

    await ensureChat(chatId);
    const settings = await getChatSettings(chatId);
    if (!settings?.filter_enabled) return;

    if (await checkIsAdminOrCreator(ctx, userId)) return;

    // 1. Пересланные истории (Stories) — блокируем всегда, независимо от комментария
    if (ctx.message.story) {
        return handleViolation(ctx, chatId, userId, 'story');
    }

    // 2. Форвард из канала, не входящего в вайтлист владельца — блокируем
    //    независимо от того, есть ли в сообщении ссылка
    if (ctx.message.forward_origin?.type === 'channel') {
        const sourceUsername = ctx.message.forward_origin.chat?.username?.toLowerCase();
        const ownerChannels = new Set(await listOwnerChannels(chatId));
        const isAllowedSource = sourceUsername && ownerChannels.has(sourceUsername);

        if (!isAllowedSource) {
            return handleViolation(ctx, chatId, userId, 'forward');
        }
    }

    // 3. Обычная проверка ссылок/упоминаний — из текста, подписи и превью
    const links = extractLinks(ctx.message);
    if (links.length === 0) return;

    const ownerChannels = new Set(await listOwnerChannels(chatId));

    for (const link of links) {
        const isAllowed = await isLinkAllowed(ctx, link, chatId, ownerChannels);
        if (isAllowed) continue;

        return handleViolation(ctx, chatId, userId, 'links');
    }
}

// Проверяет, разрешена ли конкретная ссылка/упоминание:
// - @username админа/владельца или разрешённого канала — ок
// - t.me/username разрешённого канала — ок
// - обычный внешний домен из вайтлиста доменов — ок
// - всё остальное — нет
async function isLinkAllowed(ctx, link, chatId, ownerChannels) {
    if (link.startsWith('@')) {
        const username = link.slice(1).toLowerCase();

        if (ownerChannels.has(username)) return true;

        const { usernames: adminUsernames } = await getCachedAdmins(ctx, chatId);
        if (adminUsernames.has(username)) return true;

        return false;
    }

    const domain = getDomain(link);

    if (domain === 't.me' || domain === 'telegram.me') {
        const tMeMatch = link.match(/t(?:elegram)?\.me\/([a-zA-Z0-9_]+)/i);
        const username = tMeMatch ? tMeMatch[1].toLowerCase() : null;
        if (!username) return false;

        if (ownerChannels.has(username)) return true;

        const { usernames: adminUsernames } = await getCachedAdmins(ctx, chatId);
        return adminUsernames.has(username);
    }

    if (domain) {
        return isDomainWhitelisted(chatId, domain);
    }

    return false;
}

// Общая обработка нарушения: удаление сообщения, запись страйка,
// предупреждение или перманентный мут при достижении лимита
async function handleViolation(ctx, chatId, userId, reason) {
    console.log('Пытаюсь удалить:', {
        messageId: ctx.message.message_id,
        updateType: ctx.update.edited_message ? 'edited_message' : 'message',
        text: ctx.message.text,
    });

    try {
        await ctx.deleteMessage();
    } catch (err) {
        console.error('Не удалось удалить сообщение:', err.message);
        console.error('ПОЛНАЯ ошибка удаления:', JSON.stringify(err, null, 2));
        return;
    }

    await recordViolation(chatId, userId);
    const violations = await countRecentViolations(chatId, userId, VIOLATION_WINDOW_MINUTES);

    if (violations >= VIOLATIONS_BEFORE_MUTE) {
        await muteUser(ctx, userId);
    } else {
        await sendAutoDeleteWarning(ctx, violations, reason);
    }
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
            // until_date не передаём — мут бессрочный, снимается только вручную
        );

        await clearViolations(ctx.chat.id, userId);

        await ctx.reply(
            `${nameOrMention(ctx.from)} получил перманентный бан за повторные нарушения. Снять может только администратор вручную.`
        );
    } catch (err) {
        console.error('Не удалось замьютить пользователя:', err.message);
    }
}

// Текст предупреждения зависит от причины удаления
async function sendAutoDeleteWarning(ctx, violations, reason = 'links') {
    const reasonTexts = {
        links: 'отправлять ссылки в этом чате запрещено',
        story: 'пересылать истории в этом чате запрещено',
        forward: 'пересылать сообщения из посторонних каналов запрещено',
    };

    try {
        const warning = await ctx.reply(
            `${nameOrMention(ctx.from)}, ${reasonTexts[reason] ?? reasonTexts.links}. ` +
            `Нарушение ${violations}/${VIOLATIONS_BEFORE_MUTE} — при следующем будет бессрочный мьют.`
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