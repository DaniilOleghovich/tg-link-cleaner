import { Bot } from 'grammy';
import { config } from './config.js';
import { handleMessage } from './handlers/messages.js';
import { adminOnly } from './middlewares/admin-only.js';

const bot = new Bot(config.botToken);

bot.on('message', handleMessage);

bot.command('whitelist_add', adminOnly, async (ctx) => {
    // логика добавления домена
});

bot.command('settings', adminOnly, async (ctx) => {
    // логика показа/изменения настроек
});

bot.catch((err) => {
    console.error('Ошибка в боте:', err);
});

bot.start();
console.log('Бот запущен');