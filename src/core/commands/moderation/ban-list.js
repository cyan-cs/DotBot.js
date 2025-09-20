const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban-list')
        .setDescription('Banされているユーザーの一覧を表示します (管理者専用)'),

    async executeSlash(interaction) {
        if (!interaction.member.permissions.has('BanMembers')) {
            return interaction.reply({ content: 'このコマンドを使用する権限がありません。', flags: MessageFlags.Ephemeral });
        }

        try {
            const bans = await interaction.guild.bans.fetch();
            if (bans.size === 0) {
                return interaction.reply({ content: '現在Banされているユーザーはいません。', flags: MessageFlags.Ephemeral });
            }

            const embed = new EmbedBuilder()
                .setTitle('🚫 Banされているユーザー一覧')
                .setColor(0xFF0000)
                .setTimestamp();

            bans.forEach(ban => {
                embed.addFields({ name: ban.user.tag, value: `ID: ${ban.user.id}`, inline: false });
            });

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('Error fetching ban list:', error);
            await interaction.reply({ content: 'Banリストの取得中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
        }
    }
};
