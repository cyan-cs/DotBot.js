const Discord = require('discord.js');
const logger = require('../utils/logger.js');
const { updateGuildCountPresence } = require('../utils/presence.js');
const { registerGuildCommands } = require('../utils/commands-manager.js');

module.exports = {
    name: Discord.Events.ClientReady,
    once: true,
    /**
     * ボットがDiscord APIに接続し、準備ができたときに実行されます。
     * @param {import('discord.js').Client} client - Discordクライアントインスタンス
     */
    async execute(client) {
        if (!client.user) {
            logger.error('クライアントユーザーが利用できません。ボットは正常に動作しない可能性があります。');
            return;
        }

        logger.info(`✅ ログイン成功: ${client.user.tag} (ID: ${client.user.id})`);

        // ギルドコマンドを登録
        for (const [guildId, commands] of client.guildCommands) {
            try {
                await registerGuildCommands(guildId, commands);
            } catch (error) {
                logger.error(`ギルド(${guildId})のコマンド登録に失敗しました。`, error);
            }
        }

        // 起動時に初回実行
        try {
            updateGuildCountPresence(client);
        } catch (error) {
            logger.error('起動時のプレゼンス更新に失敗しました。', error);
        }

        // 15分ごとに定期実行（フォールバック）
        setInterval(() => {
            try {
                updateGuildCountPresence(client);
            } catch (error) {
                logger.error('定期的なプレゼンス更新に失敗しました。', error);
            }
        }, 15 * 60 * 1000);
    },
};