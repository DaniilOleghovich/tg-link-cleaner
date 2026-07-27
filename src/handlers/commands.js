import { getChatSettings, setFilterEnabled, ensureChat } from '../db/repositories/chats.js';
import { addWhitelistDomain, removeWhitelistDomain, listWhitelistDomains } from '../db/repositories/whitelist.js';
import { getDomain } from '../utils/link-detector.js';
import {
    addWhitelistUser,
    removeWhitelistUser,
    listWhitelistUsers,
} from '../db/repositories/whitelist.js';

export async function cmdSettings(ctx) {
    await ensureChat(ctx.chat.id);
    const settings = await getChatSettings(ctx.chat.id);
    const domains = await listWhitelistDomains(ctx.chat.id);
    const userIds = await listWhitelistUsers(ctx.chat.id);

    await ctx.reply(
        `Настройки чата:\n +
    Фильтр ссылок: ${settings.filter_enabled ? 'включен' : 'выключен'}\n +
    Разрешённые домены: ${domains.length ? domains.join(', ') : 'нет'}\n +
    Разрешённые пользователи (ID): ${userIds.length ? userIds.join(', ') : 'нет'}`
);
}

export async function cmdToggleFilter(ctx) {
    await ensureChat(ctx.chat.id);
    const settings = await getChatSettings(ctx.chat.id);
    const newValue = !settings.filter_enabled;
    await setFilterEnabled(ctx.chat.id, newValue);
    await ctx.reply(`Фильтр ссылок ${newValue ? 'включен' : 'выключен'}.`);
}

export async function cmdWhitelistAdd(ctx) {
    const domain = ctx.match?.trim();
    if (!domain) {
        return ctx.reply('Использование: /whitelist_add example.com');
    }

    const cleanDomain = getDomain(domain) ?? domain;
    await ensureChat(ctx.chat.id);
    await addWhitelistDomain(ctx.chat.id, cleanDomain);
    await ctx.reply(`Домен ${cleanDomain} добавлен в белый список.`);
}

export async function cmdWhitelistRemove(ctx) {
    const domain = ctx.match?.trim();
    if (!domain) {
        return ctx.reply('Использование: /whitelist_remove example.com');
    }

    await removeWhitelistDomain(ctx.chat.id, domain);
    await ctx.reply(`Домен ${domain} удалён из белого списка.`);
}

export async function cmdWhitelistUserAdd(ctx) {
    const target = ctx.message.reply_to_message?.from;
    if (!target) {
        return ctx.reply('Ответьте этой командой на сообщение пользователя, которого хотите добавить в белый список.');
    }

    await ensureChat(ctx.chat.id);
    await addWhitelistUser(ctx.chat.id, target.id);
    await ctx.reply(`Пользователь ${target.first_name} добавлен в белый список.`);
}

export async function cmdWhitelistUserRemove(ctx) {
    const target = ctx.message.reply_to_message?.from;
    if (!target) {
        return ctx.reply('Ответьте этой командой на сообщение пользователя, которого хотите убрать из белого списка.');
    }

    await removeWhitelistUser(ctx.chat.id, target.id);
    await ctx.reply(`Пользователь ${target.first_name} удалён из белого списка.`);
}