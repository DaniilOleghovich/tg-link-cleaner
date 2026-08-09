import { Bot, session } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { config } from './config.js';
import { handleMessage } from './handlers/messages.js';
import { handleNewMembers } from './handlers/newMember.js';
import { adminOrCreatorOnly } from './middlewares/admin-or-creator-only.js';
import {
    cmdSettings,
    cmdToggleFilter,
    cmdToggleVerification,
    cmdWhitelistAdd,
    cmdWhitelistRemove,
    cmdOwnerChannelAdd,
    cmdOwnerChannelRemove,
} from './handlers/commands.js';
import { cmdMenu } from './handlers/menu.js';
import { registerMenuCallbacks } from './handlers/menuCallbacks.js';
import { addDomainConversation } from './conversations/addDomain.js';
import { addOwnerChannelConversation } from './conversations/addOwnerChannel.js';

const bot = new Bot(config.botToken);

bot.use(session({ initial: () => ({}) }));
bot.use(conversations());
bot.use(createConversation(addDomainConversation, 'addDomain'));
bot.use(createConversation(addOwnerChannelConversation, 'addOwnerChannel'));

bot.command('settings', adminOrCreatorOnly, cmdSettings);
bot.command('toggle_filter', adminOrCreatorOnly, cmdToggleFilter);
bot.command('toggle_verification', adminOrCreatorOnly, cmdToggleVerification);
bot.command('whitelist_add', adminOrCreatorOnly, cmdWhitelistAdd);
bot.command('whitelist_remove', adminOrCreatorOnly, cmdWhitelistRemove);
bot.command('owner_channel_add', adminOrCreatorOnly, cmdOwnerChannelAdd);
bot.command('owner_channel_remove', adminOrCreatorOnly, cmdOwnerChannelRemove);
bot.command('menu', adminOrCreatorOnly, cmdMenu);

registerMenuCallbacks(bot);

bot.on('message:new_chat_members', handleNewMembers);

// Проверяем и обычные новые сообщения, и отредактированные —
// ссылка/превью может быть добавлена или изменена уже после отправки
bot.on('message', handleMessage);
bot.on('edited_message', handleMessage);

bot.catch((err) => {
    console.error('Ошибка в боте:', err);
});

bot.start();
console.log('Бот запущен');