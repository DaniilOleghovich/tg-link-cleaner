import { Bot } from 'grammy';
import { config } from './config.js';
import { handleMessage } from './handlers/message.js';
import { adminOnly } from './middlewares/admin-only.js';
import {
    cmdSettings,
    cmdToggleFilter,
    cmdWhitelistAdd,
    cmdWhitelistRemove,
} from './handlers/commands.js';

const bot = new Bot(config.botToken);

bot.command('settings', adminOnly, cmdSettings);
bot.command('toggle_filter', adminOnly, cmdToggleFilter);
bot.command('whitelist_add', adminOnly, cmdWhitelistAdd);
bot.command('whitelist_remove', adminOnly, cmdWhitelistRemove);

bot.on('message', handleMessage);

bot.catch((err) => {
    console.error('Ошибка в боте:', err);
});

bot.start();
console.log('Бот запущен');