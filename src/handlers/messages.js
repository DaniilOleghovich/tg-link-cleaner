import { getChatSettings, ensureChat } from '../db/repositories/chats.js';
import { isDomainWhitelisted, isUserWhitelisted } from '../db/repositories/whitelist.js';
import { extractLinks, getDomain } from '../utils/link-detector.js';
import {recordViolation, countRecentViolations, clearViolations} from '../db/repositories/violations.js';

const WARNING_LIFETIME_MS = 12000;
const VIOLATION_WINDOW_MINUTES = 10;
const VIOLATIONS_BEFORE_MUTE = 3;
const MUTE_DURATION_MINUTES = 1;

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

async function muteUser(ctx, userId) {
    const untilDate = Math.floor(Date.now() / 1000) + MUTE_DURATION_MINUTES * 60;

    try {
        await ctx.api.restrictChatMember(
            ctx.chat.id,
            userId, {
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
            },
            {until_date: untilDate}
        );

        await clearViolations(ctx.chat.id, userId);

        await ctx.reply(
            `${nameOrMention(ctx.from)} получил мут на ${MUTE_DURATION_MINUTES} мин. за повторную отправку ссылок.`
    );
    } catch (err) {
        console.error('Не удалось замутить пользователя:', err.message);
    }
}

async function sendAutoDeleteWarning(ctx, violations) {
    try {
        const warning = await ctx.reply(
            `${nameOrMention(ctx.from)}, отправлять ссылки в этом чате запрещено.
        Нарушение ${violations}/${VIOLATIONS_BEFORE_MUTE} — при следующем будет мут.`
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