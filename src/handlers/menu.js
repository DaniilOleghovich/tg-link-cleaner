import { InlineKeyboard } from 'grammy';
import {getTrackedMenu, trackMenu} from "../utils/menuTracker.js";

export function buildMainMenuKeyboard() {
    return new InlineKeyboard()
        .text('🔗 Фильтр ссылок', 'menu:filter').row()
        .text('✅ Домены', 'menu:domains').row()
        .text('🛡️ Проверка новых участников', 'menu:verification').row()
        .text('📢 Разрешенные каналы', 'menu:owner_channel').row()
        .text('⚙️ Настройки', 'menu:settings');
}

export async function cmdMenu(ctx) {
    const chatId = ctx.chat.id;

    const previous = getTrackedMenu(chatId);
    if (previous) {
        try {
            await ctx.api.deleteMessage(chatId, previous.messageId);
        } catch (err) {
            // старое меню могло быть уже удалено вручную — не критично
        }
    }

    const sentMessage = await ctx.reply('Панель управления ботом:', {
        reply_markup: buildMainMenuKeyboard(),
    });

    trackMenu(ctx, chatId, sentMessage.message_id);
}