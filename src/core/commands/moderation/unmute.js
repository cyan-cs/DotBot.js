const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('指定したユーザーのMuteを解除します。')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Muteを解除するユーザーを指定してください。')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Mute解除の理由を指定してください。')
                .setRequired(false)
        ),

    // 共通の処理
    async execute(guild, targetId, reason, replyMethod) {
        if (!targetId) {
            return replyMethod('指定されたユーザーIDが無効です。');
        }

        let target;
        try {
            target = await guild.members.fetch(targetId);
        } catch (error) {
            logger.error(`ユーザー取得失敗: ${error.message}`);
            return replyMethod('指定されたユーザーはこのサーバーにいません。');
        }

        try {
            // ミュート解除処理
            await target.timeout(null, reason || 'Mute解除');
            await replyMethod(`${target.user.tag} のMuteを解除しました。`);
            logger.warn('Unmute command executed.');
        } catch (error) {
            logger.error(`Mute解除失敗: ${error.message}`);
            return replyMethod('Mute解除の実行に失敗しました。');
        }
    },

    // 権限チェックと引数処理
    async handleCommand(context, getArgs, replyMethod) {
        if (!context.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return replyMethod('あなたにはこのコマンドを使用する権限がありません。', MessageFlags.Ephemeral);
        }

        const { guild, targetId, reason } = getArgs();
        await this.execute(guild, targetId, reason, replyMethod);
    },

    async executeSlash(interaction) {
        await this.handleCommand(interaction, () => ({
            guild: interaction.guild,
            targetId: interaction.options.getUser('target').id,
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
