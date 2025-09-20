const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('del')
        .setDescription('指定した数やユーザー、ユーザーIDのメッセージを削除します (管理者専用)')
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('削除するメッセージの数 (1~100)')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('削除対象のユーザーを指定します。')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('削除対象のユーザーIDを指定します。')
                .setRequired(false)
        ),

    async executeSlash(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: 'このコマンドを使用する権限がありません。', flags: MessageFlags.Ephemeral });
        }

        logger.info('Message deletion command executed.');

        const count = interaction.options.getInteger('count') || 10; // デフォルトは10件
        const user = interaction.options.getUser('user');
        const userId = interaction.options.getString('userid');

        // 削除するメッセージ数が範囲外の場合
        if (count < 1 || count > 100) {
            return interaction.reply({ content: '削除するメッセージの数は1~100の範囲で指定してください。', flags: MessageFlags.Ephemeral });
        }

        // ユーザーIDが指定された場合、正しいID形式か確認
        if (userId && !/^\d{17,19}$/.test(userId)) {
            return interaction.reply({ content: '指定されたユーザーIDが無効です。', flags: MessageFlags.Ephemeral });
        }

        try {
            // チャンネルからメッセージを最大100件取得（キャッシュに頼る）
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            let filteredMessages = messages;

            // ユーザー指定があればフィルタリング
            if (user) {
                filteredMessages = messages.filter(msg => msg.author.id === user.id);
            } else if (userId) {
                filteredMessages = messages.filter(msg => msg.author.id === userId);
            }

            // 最初の 'count' 件を選択
            filteredMessages = Array.from(filteredMessages.values()).slice(0, count);

            // メッセージを削除
            const deletedMessages = await interaction.channel.bulkDelete(filteredMessages, true)
                .catch(error => {
                    logger.error('Error deleting messages:', error);
                    throw new Error('一部のメッセージは削除できませんでした。');
                });

            // 成功した場合
            await interaction.reply({ content: `${deletedMessages.size}件のメッセージを削除しました。`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            logger.error('Error deleting messages:', error);
            await interaction.reply({ content: 'メッセージの削除中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
        }
    },
};
