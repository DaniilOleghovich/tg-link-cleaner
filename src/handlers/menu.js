import { InlineKeyboard } from 'grammy';

export function buildMainMenuKeyboard() {
    return new InlineKeyboard()
        .text('🔗 Фильтр ссылок', 'menu:filter').row()
        .text('✅ Домены', 'menu:domains').row()
        .text('🛡️ Проверка новых участников', 'menu:verification').row()
        .text('⚙️ Настройки', 'menu:settings');
}

export async function cmdMenu(ctx) {
    await ctx.reply('Панель управления ботом:', {
        reply_markup: buildMainMenuKeyboard(),
    });
}