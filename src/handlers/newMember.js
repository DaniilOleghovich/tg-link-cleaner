import { InlineKeyboard } from 'grammy';
import {ensureChat, getChatSettings} from "../db/repositories/chats.js";

const VERIFY_TIMEOUT_MS = 30000;

export async function handleNewMembers(ctx) {
    const newMembers = ctx.message.new_chat_members;
    if (!newMembers || newMembers.length === 0) return;

    const chatId = ctx.chat.id;
    await ensureChat(chatId);
    const settings = await getChatSettings(chatId);

    if (!settings?.verification_enabled) return; // фича выключена — пропускаем всех

    for (const member of newMembers) {
        if (member.is_bot) continue;
        await startVerification(ctx, member);
    }
}

async function startVerification(ctx, member) {
    const chatId = ctx.chat.id;
    const userId = member.id;

    // Ограничиваем сразу — юзер не может писать/спамить, пока не пройдёт капчу
    try {
        await ctx.api.restrictChatMember(chatId, userId, {
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
        });
    } catch (err) {
        console.error('Не удалось ограничить нового участника:', err.message);
        return;
    }

    const keyboard = new InlineKeyboard().text('✅ Я не бот', `verify:${userId}`);

    const verifyMessage = await ctx.reply(
        `${nameOrMention(member)}, добро пожаловать! Нажмите кнопку ниже в течение 30 секунд, иначе будете удалены из чата.`,
        { reply_markup: keyboard }
    );

    setTimeout(async () => {
        await handleVerificationTimeout(ctx, chatId, userId, verifyMessage.message_id);
    }, VERIFY_TIMEOUT_MS);
}

async function handleVerificationTimeout(ctx, chatId, userId, messageId) {
    try {
        const member = await ctx.api.getChatMember(chatId, userId);

        // Если статус НЕ restricted — значит, ограничения уже сняты (юзер прошёл проверку)
        if (member.status !== 'restricted') return;

        // Если restricted, но can_send_messages true — тоже прошёл (на случай частичных прав)
        if (member.can_send_messages) return;

        // Не прошёл — кикаем
        await ctx.api.banChatMember(chatId, userId);
        await ctx.api.unbanChatMember(chatId, userId); // сразу разбаниваем, чтобы это был кик, а не постоянный бан
    } catch (err) {
        console.error('Не удалось кикнуть непрошедшего проверку:', err.message);
    }

    try {
        await ctx.api.deleteMessage(chatId, messageId);
    } catch (err) {
        // сообщение могло быть уже удалено после успешной проверки
    }
}

function nameOrMention(user) {
    return user.username ? `@${user.username}` : user.first_name;
}