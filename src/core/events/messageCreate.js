const { isServerBlacklisted, handleBlacklistCommand } = require('../utils/blacklist.js');
const { MiQ } = require('makeitaquote');
const logger = require('../utils/logger.js');
const { handleError, handleCommandNotFound } = require('./Handler/errorHandlings.js');
const { logUserAction } = require('./Handler/eventHandlings.js');
const { addMessageId } = require('../utils/database.js');
const { parseCommandArgs } = require('../utils/argumentParser.js');

// コマンドエイリアスと引数定義を読み込む
const commandAliases = require('../../data/commandAliases.json');
const commandArgsConfig = require('../../data/commandArgs.json');

const prefix = '.'; // プレフィックス定義

/**
 * MiQを使用して引用画像を生成します。
 * @param {import('discord.js').Message} repliedMsg - 返信されたメッセージ
 * @param {import('discord.js').Client} client - Discordクライアントインスタンス
 * @returns {Promise<Buffer>} 生成された画像のBuffer
 */
async function generateQuoteImage(repliedMsg, client) {
    const user = repliedMsg.author;
    const buffer = await new MiQ()
        .setText(repliedMsg.content || ' ')
        .setAvatar(user.displayAvatarURL({ extension: 'png', size: 1024 }))
        .setDisplayname(user.username)
        .setUsername(user.tag)
        .setWatermark(client.user.tag) // ボットの現在のタグをウォーターマークに設定
        .generate(true);
    return buffer;
}

/**
 * 引用画像を生成して返信する
 * @param {import('discord.js').Message} message 
 */
async function handleMakeItAQuote(message) {
    try {
        if (!message.reference || !message.reference.messageId) {
            await message.reply('❌ この機能は、画像にしたいメッセージに返信する形で使用してください。');
            return;
        }

        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
        
        const buffer = await generateQuoteImage(repliedMsg, message.client);

        const sentMessage = await message.reply({ files: [{ attachment: buffer, name: 'quote.png' }], fetchReply: true });
        await sentMessage.react('🗑️');
        await addMessageId(sentMessage.id);

    } catch (err) {
        logger.error('引用画像の生成または送信に失敗しました。', err);
        await message.reply('❌ 引用画像の生成に失敗しました。元のメッセージが長すぎるか、画像を取得できませんでした。').catch(() => {});
    }
}

module.exports = {
    name: 'messageCreate',
    /**
     * メッセージ作成イベントを処理します。
     * @param {import('discord.js').Message} message - 作成されたメッセージ
     */
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // 1. ブラックリストに登録されたサーバーからのメッセージはすべて無視
        if (isServerBlacklisted(message.guild.id)) {
            return;
        }

        // 2. ブラックリスト管理コマンドを処理
        const isBlacklistCmd = await handleBlacklistCommand(message);
        if (isBlacklistCmd) {
            return; // 管理コマンドとして処理されたので終了
        }

        // 3. 引用画像生成コマンドを処理
        const isMentioned = message.mentions.has(message.client.user);
        const hasMakeIt = message.content.toLowerCase().includes('make it');

        if (isMentioned && hasMakeIt) {
            await handleMakeItAQuote(message);
            return;
        }

        // 4. プレフィックスコマンドの処理
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        // エイリアスを解決
        const resolvedCommandName = commandAliases[commandName] || commandName;
        const command = message.client.prefixCommands.get(resolvedCommandName);

        if (!command) {
            await handleCommandNotFound(commandName, message);
            return;
        }

        // commandArgsConfig を使用して引数を処理
        const argDefinitions = commandArgsConfig[resolvedCommandName];
        let processedArgs;

        try {
            // parseCommandArgsはargDefinitionsが未定義の場合、生の引数を返す
            processedArgs = parseCommandArgs(args, argDefinitions);
        } catch (error) {
            // 引数解析エラーをユーザーに通知
            await message.reply(`❌ 引数の解析中にエラーが発生しました: ${error.message}`).catch(() => {});
            logger.error(`引数解析エラー (${resolvedCommandName}):`, error);
            return;
        }

        try {
            // executeMessage関数を実行
            await command.executeMessage(message, processedArgs);
            logUserAction("CMD", commandName, message.author, message.guild);
        } catch (error) {
            await handleError(error, message);
        }
    }
};