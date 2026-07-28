import { Bot, session } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { config } from './config.js';
import { handleMessage } from './handlers/messages.js';
import { adminOrCreatorOnly } from './middlewares/admin-or-creator-only.js';
import {
    cmdSettings,
    cmdToggleFilter, cmdToggleVerification,
    cmdWhitelistAdd,
    cmdWhitelistRemove,
} from './handlers/commands.js';
import { cmdMenu } from './handlers/menu.js';
import { registerMenuCallbacks } from './handlers/menuCallbacks.js';
import { addDomainConversation } from './conversations/addDomain.js';
import {handleNewMembers} from "./handlers/newMember.js";

const bot = new Bot(config.botToken);

bot.use(session({ initial: () => ({}) }));
bot.use(conversations());
bot.use(createConversation(addDomainConversation, 'addDomain'));

bot.command('settings', adminOrCreatorOnly, cmdSettings);
bot.command('toggle_filter', adminOrCreatorOnly, cmdToggleFilter);
bot.command('whitelist_add', adminOrCreatorOnly, cmdWhitelistAdd);
bot.command('whitelist_remove', adminOrCreatorOnly, cmdWhitelistRemove);
bot.command('menu', adminOrCreatorOnly, cmdMenu);
bot.command('toggle_verification', adminOrCreatorOnly, cmdToggleVerification);

registerMenuCallbacks(bot);

bot.on('message:new_chat_members', handleNewMembers);

bot.on('message', handleMessage);

bot.catch((err) => {
    console.error('Ошибка в боте:', err);
});

bot.start();
console.log('Бот запущен');