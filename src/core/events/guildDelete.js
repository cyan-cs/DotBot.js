const { Events } = require('discord.js');
const logger = require('../utils/logger.js');
const { updateGuildCountPresence } = require('../utils/presence.js');

module.exports = {
    name: Events.GuildDelete,
    /**
     * ボットがギルドから削除されたときに実行されます。
     * @param {import('discord.js').Guild} guild - 削除されたギルド
     */
    async execute(guild) {
        logger.info(`ギルドから削除されました: ${guild.name} (ID: ${guild.id}). 現在のギルド数: ${guild.client.guilds.cache.size}`);
        
        // プレゼンスを更新
        try {
            updateGuildCountPresence(guild.client);
        } catch (error) {
            logger.error('ギルド削除時のプレゼンス更新に失敗しました。', error);
        }
    },
};