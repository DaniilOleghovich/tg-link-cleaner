import { checkIsAdminOrCreator } from '../utils/permissions.js';

export async function adminOnlyCallback(ctx, next) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const isAdmin = await checkIsAdminOrCreator(ctx, userId);

    if (!isAdmin) {
        await ctx.answerCallbackQuery({
            text: 'Меню доступно только администраторам.',
            show_alert: true,
        });
        return;
    }

    return next();
}