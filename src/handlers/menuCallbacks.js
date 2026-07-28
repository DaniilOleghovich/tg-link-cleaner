import { InlineKeyboard } from 'grammy';
import { buildMainMenuKeyboard } from './menu.js';
import {getChatSettings, setFilterEnabled, ensureChat, setVerificationEnabled} from '../db/repositories/chats.js';
import { listWhitelistDomains, removeWhitelistDomain } from '../db/repositories/whitelist.js';
import { adminOnlyCallback } from '../middlewares/admin-only-callback.js';

export function registerMenuCallbacks(bot) {
    bot.callbackQuery(/^(menu|domain|filter|verification):/, adminOnlyCallback);

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
            `Проверка новых участников: ${settings.verification_enabled ? 'включена' : 'выключена'}\n` +
            `Разрешённые домены: ${domains.length ? domains.join(', ') : 'нет'}`,
            { reply_markup: backButton() }
        );
    });

    bot.callbackQuery(/^verify:(\d+)$/, async (ctx) => {
        const targetUserId = parseInt(ctx.match[1], 10);
        const clickerId = ctx.from.id;

        if (clickerId !== targetUserId) {
            return ctx.answerCallbackQuery({
                text: 'Эта кнопка не для вас.',
                show_alert: true,
            });
        }

        try {
            await ctx.api.restrictChatMember(ctx.chat.id, targetUserId, {
                can_send_messages: true,
                can_send_audios: true,
                can_send_documents: true,
                can_send_photos: true,
                can_send_videos: true,
                can_send_video_notes: true,
                can_send_voice_notes: true,
                can_send_polls: true,
                can_send_other_messages: true,
                can_add_web_page_previews: true,
            });

            await ctx.answerCallbackQuery('Проверка пройдена!');
            await ctx.deleteMessage();
        } catch (err) {
            console.error('Не удалось снять ограничения после проверки:', err.message);
            await ctx.answerCallbackQuery({ text: 'Ошибка, попробуйте позже.', show_alert: true });
        }
    });

    bot.callbackQuery('menu:verification', async (ctx) => {
        await ctx.answerCallbackQuery();
        await renderVerificationMenu(ctx);
    });

    bot.callbackQuery('verification:enable', async (ctx) => {
        await setVerificationEnabled(ctx.chat.id, true);
        await ctx.answerCallbackQuery('Проверка включена');
        await renderVerificationMenu(ctx);
    });

    bot.callbackQuery('verification:disable', async (ctx) => {
        await setVerificationEnabled(ctx.chat.id, false);
        await ctx.answerCallbackQuery('Проверка выключена');
        await renderVerificationMenu(ctx);
    });

    async function renderVerificationMenu(ctx) {
        await ensureChat(ctx.chat.id);
        const settings = await getChatSettings(ctx.chat.id);
        const isEnabled = settings.verification_enabled;

        const keyboard = new InlineKeyboard()
            .text(isEnabled ? '✅ Включена (текущее)' : 'Включить', 'verification:enable').row()
            .text(!isEnabled ? '❌ Выключена (текущее)' : 'Выключить', 'verification:disable').row()
            .text('« Назад', 'menu:back');

        await ctx.editMessageText(
            `Проверка новых участников сейчас: ${isEnabled ? '✅ включена' : '❌ выключена'}`,
            { reply_markup: keyboard }
        );
    }

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