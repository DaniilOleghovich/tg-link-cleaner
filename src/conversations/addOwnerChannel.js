import { addOwnerChannel } from '../db/repositories/ownerChannels.js';
import {isValidTelegramUsername, normalizeChannelUsername} from '../utils/link-detector.js';

export async function addOwnerChannelConversation(conversation, ctx) {
    await ctx.reply(
        'Отправьте username или ссылку на канал (например, mordan_fx, @mordan_fx или https://t.me/mordan_fx):'
    );

    const { message } = await conversation.wait();
    const input = message?.text?.trim();

    if (!input) {
        return ctx.reply('Канал не распознан, попробуйте снова через меню.');
    }

    const username = normalizeChannelUsername(input);

    if (!isValidTelegramUsername(username)) {
        return ctx.reply(
            'Некорректный username. Требования Telegram: 5–32 символа, только латинские буквы, цифры и подчёркивание, ' +
            'не может начинаться с цифры, не может заканчиваться подчёркиванием, без двойного подчёркивания подряд. ' +
            'Попробуйте снова через /menu.'
        );
    }

    await addOwnerChannel(ctx.chat.id, username);
    await ctx.reply(`Канал @${username} добавлен в список разрешённых. Откройте /menu, чтобы вернуться в панель.`);
}