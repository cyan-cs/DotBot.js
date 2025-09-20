const logger = require('../utils/logger.js');
const { isMessageTracked, removeMessageId } = require('../utils/database.js');
const { isServerBlacklisted } = require('../utils/blacklist.js');
const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageReactionAdd,
    /**
     * メッセージにリアクションが追加されたイベントを処理します。
     * @param {import('discord.js').MessageReaction} reaction - 追加されたリアクション
     * @param {import('discord.js').User} user - リアクションを追加したユーザー
     */
    async execute(reaction, user) {
        try {
            // partialリアクション（古いメッセージへのリアクションなど）を解決
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch (err) {
                    logger.warn('リアクションのfetchに失敗しました。', err);
                    return;
                }
            }

            const message = reaction.message;

            // ブラックリストチェック
            if (message.guild && isServerBlacklisted(message.guild.id)) {
                return; // ブラックリストに登録されたサーバーからのリアクションは無視
            }

            // 🗑️絵文字でなければ、またはBOT自身によるリアクション、BOT以外のメッセージへのリアクションは無視
            if (reaction.emoji.name !== '🗑️' || user.bot || !message.author.bot || message.author.id !== reaction.client.user.id) {
                return;
            }

            // メッセージがDBで追跡されているか確認
            const isTracked = await isMessageTracked(message.id);
            if (!isTracked) {
                return; // 追跡されていないメッセージは削除しない
            }

            // メッセージ削除処理
            try {
                await message.delete();
                await removeMessageId(message.id); // DBからもIDを削除
                logger.info(`[TRASH] ${user.tag} がメッセージ (${message.id}) を削除しました。`);
            } catch (deleteErr) {
                logger.error('メッセージの削除に失敗しました。', deleteErr);
            }
        } catch (e) {
            logger.error('リアクション処理中に予期せぬエラーが発生しました。', e);
        }
    }
};
