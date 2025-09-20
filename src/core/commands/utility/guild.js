const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createServerInfoEmbed, createErrorEmbed } = require('../../utils/embed.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription('このサーバーの情報を表示します。'),
    guildOnly: true,
    targetGuildId: '1406636169239986176',

    async executeSlash(interaction) {
        const guild = interaction.guild;

        try {
            const embed = createServerInfoEmbed(guild);
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error(`Failed to fetch guild info for ID ${guild.id}:`, error);
            const errorEmbed = createErrorEmbed('サーバー情報の取得中にエラーが発生しました。');
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
    },
};