const Discord = require('discord.js');
const logger = require('../utils/logger.js');
const { createErrorEmbed } = require('../utils/embed.js');
const { handleError } = require('./Handler/errorHandlings.js');
const { logUserAction } = require('./Handler/eventHandlings.js');
const { isServerBlacklisted } = require('../utils/blacklist.js');

module.exports = {
    name: Discord.Events.InteractionCreate,
    /**
     * インタラクションイベントを処理します。
     * @param {import('discord.js').Interaction} interaction - 発生したインタラクション
     */
    async execute(interaction) {
        // スラッシュコマンド以外のインタラクションは無視
        if (!interaction.isChatInputCommand()) return;

        // ブラックリストチェック
        if (interaction.guild && isServerBlacklisted(interaction.guild.id)) {
            return; // ブラックリストに登録されたサーバーからのインタラクションは無視
        }

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            await handleCommandNotFound(interaction.commandName, interaction);
            return;
        }

        logger.info(`[CMD] /${interaction.commandName} by ${interaction.user.tag} in ${interaction.guild ? `${interaction.guild.name} (ID: ${interaction.guild.id})` : 'DM'}`);

        try {
            // コマンドの実行
            await command.executeSlash(interaction);
            logUserAction("CMD", interaction.commandName, interaction.user, interaction.guild);
        } catch (error) {
            await handleError(error, interaction);
        }
    },
};
