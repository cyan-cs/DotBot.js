const logger = require('../../utils/logger');
const { createErrorEmbed } = require('../../utils/embed');
const { addMessageId } = require('../../utils/database');

/**
 * エラーを処理し、ログに記録し、必要に応じてユーザーにフィードバックを提供します。
 * @param {Error} error - 発生したエラーオブジェクト
 * @param {object} context - エラーが発生したコンテキスト (例: Discord Interaction, Message)
 */
async function handleError(error, context) {
    logger.error('エラーが発生しました:', error);

    // Discordのコンテキストがある場合、ユーザーにエラーを通知
    if (context && (context.replied || context.deferred || context.reply)) {
        const errorEmbed = createErrorEmbed('コマンドの実行中に予期せぬエラーが発生しました。');
        try {
            let sentMessage;
            if (context.replied || context.deferred) {
                sentMessage = await context.followUp({ embeds: [errorEmbed], ephemeral: true, fetchReply: true });
            } else if (context.reply) { // For Message objects
                sentMessage = await context.reply({ embeds: [errorEmbed], ephemeral: true, fetchReply: true });
            }

            if (sentMessage) {
                await sentMessage.react('🗑️');
                await addMessageId(sentMessage.id);
            }

            
        } catch (replyError) {
            logger.error('エラーメッセージの送信中にエラーが発生しました:', replyError);
        }
    }
}

/**
 * 存在しないコマンドが呼び出された場合のエラーを処理します。
 * @param {string} commandName - 見つからなかったコマンドの名前
 * @param {object} context - エラーが発生したコンテキスト (Discord Interaction または Message)
 */
async function handleCommandNotFound(commandName, context) {
    logger.warn(`不明なコマンドが呼び出されました: ${commandName}`);

    const errorEmbed = createErrorEmbed('存在しない、または利用できないコマンドです。');
    try {
        let sentMessage;
        if (context.replied || context.deferred) {
            sentMessage = await context.followUp({ embeds: [errorEmbed], ephemeral: true, fetchReply: true });
        } else if (context.reply) { // For Message objects
            sentMessage = await context.reply({ embeds: [errorEmbed], ephemeral: true, fetchReply: true });
        }

        if (sentMessage) {
            await sentMessage.react('🗑️');
            await addMessageId(sentMessage.id);
        }
    } catch (replyError) {
        logger.error('コマンドが見つからないエラーメッセージの送信中にエラーが発生しました:', replyError);
    }
}

module.exports = {
    handleError,
    handleCommandNotFound,
};