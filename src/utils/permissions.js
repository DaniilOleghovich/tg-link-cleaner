export async function checkIsAdminOrCreator(ctx, userId) {
    try {
        const member = await ctx.getChatMember(userId);
        return ['administrator', 'creator'].includes(member.status);
    } catch (err) {
        console.error('Не удалось проверить права пользователя:', err.message);
        return false; // при ошибке — безопаснее считать не-админом
    }
}