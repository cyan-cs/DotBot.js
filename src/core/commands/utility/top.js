const { SlashCommandBuilder, EmbedBuilder, DiscordAPIError, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('このチャンネルの最初のメッセージへのリンクを取得します。'),

    async executeSlash(interaction) {
        const channel = interaction.channel;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const messages = await channel.messages.fetch({ after: 1, limit: 1 });
            const firstMessage = messages.first();

            if (firstMessage) {
                const embed = new EmbedBuilder()
                    .setTitle('チャンネルの最初のメッセージ')
                    .setDescription(`[ここをクリックしてメッセージに移動](${firstMessage.url})`)
                    .addFields(
                        { name: '送信者', value: firstMessage.author.tag, inline: true },
                        { name: '送信日時', value: `<t:${Math.floor(firstMessage.createdTimestamp / 1000)}:F>`, inline: true }
                    )
                    .setColor('Aqua');
                
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply({ content: 'このチャンネルにはメッセージがありません。' });
            }
        } catch (error) {
            logger.error('Failed to fetch the first message:', error);
            if (error instanceof DiscordAPIError && error.code === 50013) {
                await interaction.editReply({ content: 'メッセージ履歴の読み取り権限がないため、最初のメッセージを取得できませんでした。' });
            } else {
                await interaction.editReply({ content: 'メッセージの取得中に不明なエラーが発生しました。' });
            }
        }
    },
};