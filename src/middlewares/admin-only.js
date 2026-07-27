export async function adminOnly(ctx, next) {
    if (!ctx.chat || ctx.chat.type === 'private') {
        return ctx.reply('Эта команда работает только в группах.');
    }

    const userId = ctx.from?.id;
    if (!userId) return;

    const member = await ctx.getChatMember(userId);
    const isAdmin = ['administrator', 'creator'].includes(member.status);

    if (!isAdmin) {
        return ctx.reply('Эта команда доступна только администраторам.');
    }

    return next();
}