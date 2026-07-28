import { InlineKeyboard } from 'grammy';
import { buildMainMenuKeyboard } from './menu.js';
import { getChatSettings, setFilterEnabled, ensureChat } from '../db/repositories/chats.js';
import { listWhitelistDomains, removeWhitelistDomain } from '../db/repositories/whitelist.js';
import { adminOnlyCallback } from '../middlewares/admin-only-callback.js';

export function registerMenuCallbacks(bot) {
    bot.callbackQuery(/^(menu|domain|filter):/, adminOnlyCallback);

    bot.callbackQuery('menu:filter', async (ctx) => {
        await ctx.answerCallbackQuery();
        await renderFilterMenu(ctx);
    });

    bot.callbackQuery('filter:enable', async (ctx) => {
        await setFilterEnabled(ctx.chat.id, true);
        await ctx.answerCallbackQuery('Фильтр включен');
        await renderFilterMenu(ctx);
    });

    bot.callbackQuery('filter:disable', async (ctx) => {
        await setFilterEnabled(ctx.chat.id, false);
        await ctx.answerCallbackQuery('Фильтр выключен');
        await renderFilterMenu(ctx);
    });

    bot.callbackQuery('menu:domains', async (ctx) => {
        await ctx.answerCallbackQuery();
        await renderDomainsMenu(ctx);
    });

    bot.callbackQuery('domain:add', async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter('addDomain');
    });

    bot.callbackQuery(/^domain:remove:(.+)$/, async (ctx) => {
        const domain = ctx.match[1];
        await removeWhitelistDomain(ctx.chat.id, domain);
        await ctx.answerCallbackQuery(`Домен ${domain} удалён`);
        await renderDomainsMenu(ctx);
    });

    bot.callbackQuery('menu:settings', async (ctx) => {
        const domains = await listWhitelistDomains(ctx.chat.id);
        const settings = await getChatSettings(ctx.chat.id);

        await ctx.answerCallbackQuery();
        await ctx.editMessageText(
            `Настройки чата:\n` +
            `Фильтр ссылок: ${settings.filter_enabled ? 'включен' : 'выключен'}\n` +
            `Разрешённые домены: ${domains.length ? domains.join(', ') : 'нет'}`,
            { reply_markup: backButton() }
        );
    });

    bot.callbackQuery('menu:back', async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageText('Панель управления ботом:', {
            reply_markup: buildMainMenuKeyboard(),
        });
    });
}

async function renderDomainsMenu(ctx) {
    const domains = await listWhitelistDomains(ctx.chat.id);
    const keyboard = new InlineKeyboard();
    domains.forEach(d => keyboard.text(`❌ ${d}`, `domain:remove:${d}`).row());
    keyboard.text('➕ Добавить домен', 'domain:add').row();
    keyboard.text('« Назад', 'menu:back');

    await ctx.editMessageText(
        domains.length ? 'Разрешённые домены:' : 'Список пуст.',
        { reply_markup: keyboard }
    );
}

async function renderFilterMenu(ctx) {
    await ensureChat(ctx.chat.id);
    const settings = await getChatSettings(ctx.chat.id);
    const isEnabled = settings.filter_enabled;

    const keyboard = new InlineKeyboard()
        .text(isEnabled ? '✅ Включен (текущее)' : 'Включить', 'filter:enable').row()
        .text(!isEnabled ? '❌ Выключен (текущее)' : 'Выключить', 'filter:disable').row()
        .text('« Назад', 'menu:back');

    await ctx.editMessageText(
        `Фильтр ссылок сейчас: ${isEnabled ? '✅ включен' : '❌ выключен'}`,
        { reply_markup: keyboard }
    );
}

function backButton() {
    return new InlineKeyboard().text('« Назад', 'menu:back');
}