const { SlashCommandBuilder } = require('discord.js');
const { addMessageId } = require('../../utils/database.js');
const logger = require('../../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('コインを投げて表か裏をランダムに表示します。'),

    /**
     * スラッシュコマンド /coinflip を実行します。
     * @param {import('discord.js').ChatInputCommandInteraction} interaction - インタラクションオブジェクト
     */
    async executeSlash(interaction) {
        try {
            const result = Math.random() < 0.5 ? '表 (Heads)' : '裏 (Tails)';
            const sentMessage = await interaction.reply({ content: `🪙 コイントスの結果: **${result}**`, fetchReply: true });
            await sentMessage.react('🗑️');
            await addMessageId(sentMessage.id);
        } catch (error) {
            logger.error('coinflipコマンドの実行中にエラーが発生しました。', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'エラーが発生しました。' });
            } else {
                await interaction.reply({ content: 'エラーが発生しました。' });
            }
        }
    }
};
