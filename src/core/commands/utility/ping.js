const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger.js');
const { createBaseEmbed, createErrorEmbed } = require('../../utils/embed');
const { addMessageId } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Botの応答速度とAPIレイテンシを確認します。'),
    prefixCommand: true,

    async execute(replyMethod) {
        try {
            const sentMsg = await replyMethod.reply({
                embeds: [createBaseEmbed().setTitle('🏓 Pong!').setDescription('計測中...')],
                fetchReply: true
            });
            await sentMsg.react('🗑️');
            await addMessageId(sentMsg.id);

            const websocketPing = sentMsg.client.ws.ping;
            const apiLatency = sentMsg.createdTimestamp - (replyMethod.createdTimestamp || sentMsg.createdTimestamp);

            const embed = createBaseEmbed()
                .setTitle('🏓 Pong!')
                .addFields(
                    { name: 'APIレイテンシ', value: `\`${apiLatency}ms\``, inline: true },
                    { name: 'WebSocket Ping', value: `\`${websocketPing}ms\``, inline: true }
                );

            if (replyMethod.editReply) {
                await replyMethod.editReply({ embeds: [embed] });
            } else {
                await sentMsg.edit({ embeds: [embed] });
            }

            logger.info(`Ping command executed | API Latency=${apiLatency}ms, WebSocket Ping=${websocketPing}ms`);

        } catch (err) {
            logger.error(`Ping command error: ${err.message}`, err);
            const errorEmbed = createErrorEmbed('コマンドの実行中に予期せぬエラーが発生しました。');
            if (replyMethod.followUp) {
                await replyMethod.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            } else {
                await replyMethod.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
        }
    },

    async executeSlash(interaction) {
        await this.execute(interaction);
    },

    async executeMessage(message) {
        await this.execute(message);
    }
};