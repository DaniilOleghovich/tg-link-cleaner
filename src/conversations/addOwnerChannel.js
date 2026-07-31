import { addOwnerChannel } from '../db/repositories/ownerChannels.js';

export async function addOwnerChannelConversation(conversation, ctx) {
    await ctx.reply('Отправьте username канала, который нужно добавить (например, xydessa или @xydessa):');

    const { message } = await conversation.wait();
    const input = message?.text?.trim();

    if (!input) {
        return ctx.reply('Username не распознан, попробуйте снова через меню.');
    }

    const username = input.replace('@', '').toLowerCase();
    await addOwnerChannel(ctx.chat.id, username);
    await ctx.reply(`Канал @${username} добавлен в список разрешённых. Откройте /menu, чтобы вернуться в панель.`);
}