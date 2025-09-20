const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const { createBaseEmbed, createErrorEmbed } = require('../../utils/embed');
const { addMessageId } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('利用可能なすべてのコマンドを表示します。'),
    prefixCommand: true, // Add this line

    async executeSlash(interaction) {
        const cachePath = path.join(__dirname, '..', '..', '..', 'data', 'commands-cache.json');

        try {
            // コマンドIDのキャッシュを読み込む
            if (!fs.existsSync(cachePath)) {
                logger.error(`'${cachePath}' が見つかりません。`);
                const errorEmbed = createErrorEmbed('コマンド情報を取得できませんでした。');
                return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
            const rawCache = fs.readFileSync(cachePath, 'utf-8');
            const cachedCommands = JSON.parse(rawCache);
            const idMap = new Map(cachedCommands.map(cmd => [cmd.name, cmd.id]));

            // clientにロードされているコマンド本体を取得
            const commands = interaction.client.commands;

            if (!commands || commands.size === 0) {
                const errorEmbed = createErrorEmbed('利用可能なコマンドがありません。');
                return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            // 「</コマンド名:ID> : 説明」の形式で文字列を生成
            const description = commands
                .map(cmd => {
                    const commandId = idMap.get(cmd.data.name);
                    if (!commandId) return null; // キャッシュにないコマンドは表示しない
                    return `</${cmd.data.name}:${commandId}> : ${cmd.data.description}`;
                })
                .filter(line => line !== null)
                .join('\n');

            const embed = createBaseEmbed(interaction.user)
                .setTitle('コマンド一覧')
                .setDescription(description || '表示できるコマンドがありません。');

            const sentMessage = await interaction.reply({ embeds: [embed], fetchReply: true });
            await sentMessage.react('🗑️');
            await addMessageId(sentMessage.id);

        } catch (err) {
            logger.error(`SlashCommand /help error:`, err);
            const errorEmbed = createErrorEmbed('コマンドの実行中に予期せぬエラーが発生しました。');
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
        }
    },

    /**
     * プレフィックスコマンド .help を実行します。
     * @param {import('discord.js').Message} message - メッセージオブジェクト
     * @param {object} parsedArgs - 解析された引数 (helpコマンドは引数なし)
     */
    async executeMessage(message, parsedArgs) { // parsedArgs will be an empty object for help
        const cachePath = path.join(__dirname, '..', '..', '..', 'data', 'commands-cache.json');

        try {
            // コマンドIDのキャッシュを読み込む
            if (!fs.existsSync(cachePath)) {
                logger.error(`'${cachePath}' が見つかりません。`);
                const errorEmbed = createErrorEmbed('コマンド情報を取得できませんでした。');
                return message.reply({ embeds: [errorEmbed] }); // Use message.reply for prefix commands
            }
            const rawCache = fs.readFileSync(cachePath, 'utf-8');
            const cachedCommands = JSON.parse(rawCache);
            const idMap = new Map(cachedCommands.map(cmd => [cmd.name, cmd.id]));

            // clientにロードされているコマンド本体を取得
            const commands = message.client.commands; // Use message.client.commands for prefix commands

            if (!commands || commands.size === 0) {
                const errorEmbed = createErrorEmbed('利用可能なコマンドがありません。');
                return message.reply({ embeds: [errorEmbed] });
            }

            // 「</コマンド名:ID> : 説明」の形式で文字列を生成
            const description = commands
                .map(cmd => {
                    const commandId = idMap.get(cmd.data.name);
                    if (!commandId) return null; // キャッシュにないコマンドは表示しない
                    return `</${cmd.data.name}:${commandId}> : ${cmd.data.description}`;
                })
                .filter(line => line !== null)
                .join('\n');

            const embed = createBaseEmbed(message.author) // Use message.author for prefix commands
                .setTitle('コマンド一覧')
                .setDescription(description || '表示できるコマンドがありません。');

            const sentMessage = await message.reply({ embeds: [embed], fetchReply: true });
            await sentMessage.react('🗑️');
            await addMessageId(sentMessage.id);

        } catch (err) {
            logger.error(`PrefixCommand .help error:`, err);
            const errorEmbed = createErrorEmbed('コマンドの実行中に予期せぬエラーが発生しました。');
            await message.reply({ embeds: [errorEmbed] }).catch(() => {}); // Use message.reply for prefix commands
        }
    }
};