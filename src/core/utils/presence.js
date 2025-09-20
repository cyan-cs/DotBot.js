const { ActivityType } = require('discord.js');
const logger = require('./logger');

/**
 * ボットのプレゼンスを現在のサーバー数で更新します。
 * @param {import('discord.js').Client} client - Discordクライアントインスタンス
 */
function updateGuildCountPresence(client) {
    if (!client.user) {
        logger.warn('プレゼンスを更新できませんでした: client.userが利用できません。');
        return;
    }

    try {
        const guildCount = client.guilds.cache.size;

        client.user.setPresence({
            activities: [{
                name: `導入サーバー数: ${guildCount} | /help`,
                type: ActivityType.Watching,
            }],
            status: 'online',
        });

        logger.info(`プレゼンスを更新しました: ${guildCount}サーバーを監視中。`);
    } catch (error) {
        logger.error('プレゼンスの更新に失敗しました。', error);
    }
}

module.exports = { updateGuildCountPresence };