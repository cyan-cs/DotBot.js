const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { addMessageId } = require('../../utils/database.js');
const { createServerInfoEmbed } = require('../../utils/embed.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-i')
        .setDescription('このサーバーの情報を表示します。'),

    async executeSlash(interaction) {
        const guild = interaction.guild;
        if (!guild) return interaction.reply('サーバー情報を取得できませんでした。');

        try {
            const embed = createServerInfoEmbed(guild);
            const sentMsg = await interaction.reply({ embeds: [embed], fetchReply: true });

            await sentMsg.react('🗑️'); // ゴミ箱リアクション
            await addMessageId(sentMsg.id);

        } catch (err) {
            console.error('server-i Slash エラー:', err);
            await interaction.reply({ content: '情報取得中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
        }
    },

    async executeMessage(message) {
        const guild = message.guild;
        if (!guild) return message.reply('サーバー情報を取得できませんでした。');

        try {
            const embed = createServerInfoEmbed(guild);
            const sentMsg = await message.reply({ embeds: [embed] });

            await sentMsg.react('🗑️');
            await addMessageId(sentMsg.id);

        } catch (err) {
            console.error('server-i Prefix エラー:', err);
            await message.reply('情報取得中にエラーが発生しました。');
        }
    }
};
