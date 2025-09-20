const { Events } = require('discord.js');
const logger = require('../utils/logger.js');
const { updateGuildCountPresence } = require('../utils/presence.js');

module.exports = {
    name: Events.GuildCreate,
    /**
     * ボットが新しいギルドに参加したときに実行されます。
     * @param {import('discord.js').Guild} guild - 参加したギルド
     */
    async execute(guild) {
        logger.info(`新しいギルドに参加しました: ${guild.name} (ID: ${guild.id}). 現在のギルド数: ${guild.client.guilds.cache.size}`);
        
        // プレゼンスを更新
        try {
            updateGuildCountPresence(guild.client);
        } catch (error) {
            logger.error('ギルド参加時のプレゼンス更新に失敗しました。', error);
        }
    },
};