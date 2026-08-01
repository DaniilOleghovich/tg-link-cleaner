const MENU_LIFETIME_MS = 5 * 60 * 1000; // 5 минут

const openMenus = new Map(); // chatId -> { messageId, timeoutId }

export function trackMenu(ctx, chatId, messageId) {
    clearMenuTimer(chatId);

    const timeoutId = setTimeout(async () => {
        try {
            await ctx.api.editMessageReplyMarkup(chatId, messageId, {
                reply_markup: undefined,
            });
        } catch (err) {
            // сообщение могло быть уже удалено или изменено вручную — не критично
        }
        openMenus.delete(chatId);
    }, MENU_LIFETIME_MS);

    openMenus.set(chatId, { messageId, timeoutId });
}

export function clearMenuTimer(chatId) {
    const existing = openMenus.get(chatId);
    if (existing) {
        clearTimeout(existing.timeoutId);
        openMenus.delete(chatId);
    }
}

export function getTrackedMenu(chatId) {
    return openMenus.get(chatId) ?? null;
}