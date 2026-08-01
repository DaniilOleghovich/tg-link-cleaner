import {ensureChat, getChatSettings, setFilterEnabled, setVerificationEnabled} from '../db/repositories/chats.js';
import {addWhitelistDomain, listWhitelistDomains, removeWhitelistDomain} from '../db/repositories/whitelist.js';
import {getDomain, isValidTelegramUsername, normalizeChannelUsername} from '../utils/link-detector.js';
import {addOwnerChannel, listOwnerChannels, removeOwnerChannel} from "../db/repositories/ownerChannels.js";

export async function cmdSettings(ctx) {
    await ensureChat(ctx.chat.id);
    const settings = await getChatSettings(ctx.chat.id);
    const domains = await listWhitelistDomains(ctx.chat.id);
    const ownerChannels = await listOwnerChannels(ctx.chat.id);

    await ctx.reply(
        `Настройки чата:\n` +
        `Фильтр ссылок: ${settings.filter_enabled ? 'включен' : 'выключен'}\n` +
        `Проверка новых участников: ${settings.verification_enabled ? 'включена' : 'выключена'}\n` +
        `Каналы владельца: ${ownerChannels.length ? ownerChannels.map(c => '@' + c).join(', ') : 'нет'}\n` +
        `Разрешённые домены: ${domains.length ? domains.join(', ') : 'нет'}`
    );
}

export async function cmdToggleVerification(ctx) {
    await ensureChat(ctx.chat.id);
    const settings = await getChatSettings(ctx.chat.id);
    const newValue = !settings.verification_enabled;
    await setVerificationEnabled(ctx.chat.id, newValue);
    await ctx.reply(`Проверка новых участников ${newValue ? 'включена' : 'выключена'}.`);
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

export async function cmdOwnerChannelAdd(ctx) {
    const input = ctx.match?.trim();
    if (!input) {
        return ctx.reply('Использование: /owner_channel_add username (или ссылка t.me/username)');
    }

    const username = normalizeChannelUsername(input);

    if (!isValidTelegramUsername(username)) {
        return ctx.reply(
            'Некорректный username. Требования: 5–32 символа, латиница/цифры/подчёркивание, ' +
            'не начинается с цифры, не заканчивается подчёркиванием, без двойного подчёркивания подряд.'
        );
    }

    await ensureChat(ctx.chat.id);
    await addOwnerChannel(ctx.chat.id, username);
    await ctx.reply(`Канал @${username} добавлен в список разрешённых.`);
}

export async function cmdOwnerChannelRemove(ctx) {
    const input = ctx.match?.trim();
    if (!input) {
        return ctx.reply('Использование: /owner_channel_remove username');
    }

    const username = normalizeChannelUsername(input);
    await removeOwnerChannel(ctx.chat.id, username);
    await ctx.reply(`Канал @${username} удалён из списка.`);
}