import { checkIsAdminOrCreator } from '../utils/permissions.js';

export async function adminOrCreatorOnly(ctx, next) {
    if (!ctx.chat || ctx.chat.type === 'private') {
        return ctx.reply('Эта команда работает только в группах.');
    }

    const userId = ctx.from?.id;
    if (!userId) return;

    const isAdmin = await checkIsAdminOrCreator(ctx, userId);

    if (!isAdmin) {
        return ctx.reply('Эта команда доступна только администраторам.');
    }

    return next();
}