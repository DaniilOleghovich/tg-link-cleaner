import { addWhitelistDomain } from '../db/repositories/whitelist.js';
import { getDomain } from '../utils/link-detector.js';

export async function addDomainConversation(conversation, ctx) {
    await ctx.reply('Отправьте домен, который хотите добавить в белый список (например, example.com):');

    const { message } = await conversation.wait();
    const input = message?.text?.trim();

    if (!input) {
        return ctx.reply('Домен не распознан, попробуйте снова через меню.');
    }

    const domain = getDomain(input) ?? input;
    await addWhitelistDomain(ctx.chat.id, domain);
    await ctx.reply(`Домен ${domain} добавлен в белый список. Откройте /menu, чтобы вернуться в панель.`);
}