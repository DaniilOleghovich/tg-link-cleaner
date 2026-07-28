import {Bot} from 'grammy';
import {config} from './config.js';
import {handleMessage} from './handlers/messages.js';
import {adminOrCreatorOnly} from './middlewares/admin-or-creator-only.js';
import {cmdSettings, cmdToggleFilter, cmdWhitelistAdd, cmdWhitelistRemove,} from './handlers/commands.js';

const bot = new Bot(config.botToken);

bot.command('settings', adminOrCreatorOnly, cmdSettings);
bot.command('toggle_filter', adminOrCreatorOnly, cmdToggleFilter);
bot.command('whitelist_add', adminOrCreatorOnly, cmdWhitelistAdd);
bot.command('whitelist_remove', adminOrCreatorOnly, cmdWhitelistRemove);

bot.on('message', handleMessage);

bot.catch((err) => {
    console.error('Ошибка в боте:', err);
});

bot.start();
console.log('Бот запущен');