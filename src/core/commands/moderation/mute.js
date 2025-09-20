const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('指定したユーザーをmute(タイムアウト)します (管理者専用)')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('muteするユーザーを指定してください。')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('time')
                .setDescription('muteの時間を分単位で指定してください (1~1440)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('muteの理由を指定してください。')
                .setRequired(false)
        ),

    async execute(guild, targetId, time, reason, replyMethod) {
        logger.warn('Mute command executed.');

        if (!targetId) {
            return replyMethod({
                content: '指定されたユーザーはこのサーバーにいません。',
                flags: MessageFlags.Ephemeral
            });
        }

        let target;
        try {
            target = await guild.members.fetch(targetId);
        } catch (error) {
            return replyMethod({
                content: '指定されたユーザーはこのサーバーにいません。',
                flags: MessageFlags.Ephemeral
            });
        }

        const targetTag = target.user.tag;

        // muteの時間が不正な場合（1～1440分）
        const timeoutDuration = Math.min(Math.max(time || 10, 1), 1440) * 60 * 1000; // 1~1440分間の制限

        try {
            // DM通知
            await target.send({
                embeds: [
                    {
                        color: 0xffa500,
                        title: 'Mute通知',
                        description: `あなたはサーバー「${guild.name}」でタイムアウトされました。`,
                        fields: [
                            { name: '期間', value: `${timeoutDuration / 60000}分間` },
                            { name: '理由', value: reason || '不適切な行動' }
                        ],
                        timestamp: new Date(),
                    },
                ],
            }).catch(err => {
                logger.error('Failed to send mute DM:', err);
            });

            await target.timeout(timeoutDuration, reason || '不適切な行動');
            await replyMethod({
                content: `${targetTag} (ID:${target.id}) をタイムアウトしました（${timeoutDuration / 60000}分間）。`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            logger.error('Error during mute operation:', error);
            return replyMethod({
                content: 'タイムアウトの設定に失敗しました。',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    async executeSlash(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: 'あなたにはこのコマンドを使用する権限がありません。', flags: MessageFlags.Ephemeral });
        }

        const guild = interaction.guild;
        const targetId = interaction.options.getUser('target').id;
        const time = interaction.options.getInteger('time');
        const reason = interaction.options.getString('reason');

        await this.execute(guild, targetId, time, reason, (msg) => interaction.reply(msg));
    },

    async executeMessage(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return message.reply('あなたにはこのコマンドを使用する権限がありません。');
        }

        const guild = message.guild;
        const targetId = args[0].replace(/\D/g, ''); // ID部分を抽出
        if (!targetId || targetId.length !== 18) {
            return message.reply('無効なユーザーIDです。正しいIDを入力してください。');
        }
        const time = parseInt(args[1]) || 10; // 時間が指定されていない場合は10分
        const reason = args[2];

        await this.execute(guild, targetId, time, reason, (msg) => message.reply(msg));
    },
};
