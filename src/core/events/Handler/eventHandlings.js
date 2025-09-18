const logger = require('../../utils/logger');

/**
 * ユーザーのアクションをログに記録します。
 * @param {string} actionType - アクションの種類 (例: "CMD", "ROLE_PANEL")
 * @param {string} actionDetails - アクションの詳細 (例: コマンド名, ロールID)
 * @param {import('discord.js').User} user - アクションを実行したユーザー
 * @param {import('discord.js').Guild} [guild] - アクションが実行されたギルド (オプション)
 */
function logUserAction(actionType, actionDetails, user, guild) {
    const guildInfo = guild ? ` in ${guild.name} (ID: ${guild.id})` : '';
    logger.info(`[${actionType}] ${actionDetails} by ${user.tag} (ID: ${user.id})${guildInfo}`);
}

// 他のイベントハンドリング関数をここに追加できます

module.exports = {
    logUserAction,
};