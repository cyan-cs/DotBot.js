const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('指定したユーザーのBanを解除します。')
        .addStringOption(option =>
            option.setName('target')
                .setDescription('Banを解除するユーザーのIDを指定してください。')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Ban解除の理由を指定してください。')
                .setRequired(false)
        ),

    // 共通の処理
    async execute(guild, targetId, reason, replyMethod) {
        if (!targetId) {
            return replyMethod('指定されたユーザーIDが無効です。');
        }

        try {
            await guild.members.unban(targetId);
            const dmReason = reason || '不適切な行動';
            const user = await guild.members.fetch(targetId).catch(() => null);
            if (user) {
                try {
                    await user.send(`あなたのBanが解除されました。理由: ${dmReason}`);
                } catch (err) {
                    logger.error(`DM送信失敗: ユーザーID ${targetId} へのDM送信に失敗しました。`);
                    replyMethod(`ユーザー(ID: ${targetId}) のBanは正常に解除しましたが、DMを送るのを失敗しました。`);
                }
            }
            await replyMethod(`ユーザー(ID: ${targetId}) のBanを解除しました。`);
            logger.warn('Unban command executed.');
        } catch (error) {
            if (error.code === 10026) {
                return replyMethod('指定されたユーザーはBanされていません。');
            }
            logger.error(`Ban解除失敗: ${error.message}`);
            return replyMethod('Ban解除処理中にエラーが発生しました。');
        }
    },

    // 権限チェックと引数処理
    async handleCommand(context, getArgs, replyMethod) {
        if (!context.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return replyMethod('あなたにはこのコマンドを使用する権限がありません。', MessageFlags.Ephemeral);
        }

        const { guild, targetId, reason } = getArgs();
        await this.execute(guild, targetId, reason, replyMethod);
    },

    async executeSlash(interaction) {
        await this.handleCommand(interaction, () => ({
            guild: interaction.guild,
            targetId: interaction.options.getString('target'),
            reason: interaction.options.getString('reason'),
        }), (msg) => interaction.reply({ content: msg, flags: MessageFlags.Ephemeral }));
    },

    async executeMessage(message, args) {
        await this.handleCommand(message, () => ({
            guild: message.guild,
            targetId: args[0]?.replace(/\D/g, ''),
            reason: args.slice(1).join(' ') || null,
        }), (msg) => message.reply(msg));
    },
};
