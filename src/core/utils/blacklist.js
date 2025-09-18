const fs = require('fs/promises');
const path = require('path');
const logger = require('./logger');

const filePath = path.resolve(__dirname, '../../data/blacklist.json');
let blacklistedServers = new Set();
const ownerIds = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).filter(id => id.length > 0); // 空文字列を除外
const prefix = '.';

/**
 * blacklist.jsonを読み込み、メモリ上のキャッシュを更新します。
 * @returns {Promise<void>}
 */
async function refreshBlacklistCache() {
    try {
        await fs.access(filePath).catch(async (err) => {
            if (err.code === 'ENOENT') {
                await fs.writeFile(filePath, JSON.stringify([]), 'utf-8');
                logger.info('blacklist.jsonが見つからなかったため、新規作成しました。');
            } else {
                throw err; // その他のエラーは再スロー
            }
        });
        const data = await fs.readFile(filePath, 'utf-8');
        const serverIds = JSON.parse(data);
        blacklistedServers = new Set(serverIds);
        logger.info(`ブラックリストキャッシュを更新しました。(${blacklistedServers.size}件)`);
    } catch (err) {
        logger.error('blacklist.jsonの読み込みに失敗しました。', err);
    }
}

/**
 * 起動時にキャッシュを初期化し、その後1分ごとにポーリングを開始します。
 * @returns {Promise<void>}
 */
async function initAndPollBlacklist() {
    await refreshBlacklistCache();
    setInterval(refreshBlacklistCache, 60 * 1000); // 60秒 = 1分
    logger.info('blacklist.jsonの1分ごとのポーリングを開始しました。');
}

/**
 * キャッシュをJSONファイルに書き込みます。
 * @returns {Promise<void>}
 */
async function writeBlacklistToFile() {
    try {
        const serverIds = Array.from(blacklistedServers);
        await fs.writeFile(filePath, JSON.stringify(serverIds, null, 2), 'utf-8');
    } catch (err) {
        logger.error('blacklist.jsonへの書き込みに失敗しました。', err);
    }
}

/**
 * サーバーをブラックリストに追加します。
 * @param {string} serverId - 追加するサーバーのID
 * @returns {Promise<void>}
 */
async function addServerToBlacklist(serverId) {
    if (!blacklistedServers.has(serverId)) {
        blacklistedServers.add(serverId);
        await writeBlacklistToFile();
        logger.info(`サーバー(ID: ${serverId})をブラックリストに追加しました。`);
    }
}

/**
 * サーバーをブラックリストから削除します。
 * @param {string} serverId - 削除するサーバーのID
 * @returns {Promise<void>}
 */
async function removeServerFromBlacklist(serverId) {
    if (blacklistedServers.has(serverId)) {
        blacklistedServers.delete(serverId);
        await writeBlacklistToFile();
        logger.info(`サーバー(ID: ${serverId})をブラックリストから削除しました。`);
    }
}

/**
 * 指定されたサーバーがブラックリストに登録されているか確認します。
 * @param {string} serverId - 確認するサーバーのID
 * @returns {boolean}
 */
function isServerBlacklisted(serverId) {
    return blacklistedServers.has(serverId);
}

/**
 * メッセージを解析し、ブラックリストコマンドであれば処理します。
 * @param {import('discord.js').Message} message - 処理するメッセージオブジェクト
 * @returns {Promise<boolean>} コマンドとして処理された場合はtrue
 */
async function handleBlacklistCommand(message) {
    if (!message.content.startsWith(prefix)) return false;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();
    const serverId = args[0];

    if (command !== 'sb' && command !== 'sub') {
        return false; // ブラックリストコマンドではない
    }

    // 権限チェック
    if (!ownerIds.includes(message.author.id)) {
        logger.warn(`[AUTH] 権限のないユーザー(${message.author.tag})が管理者コマンド(.${command})を実行しようとしました。`);
        return true; // コマンドとして認識したが、権限がないためここで終了
    }

    if (!serverId || !/^\d{17,19}$/.test(serverId)) {
        logger.warn(`[CMD] 無効なサーバーIDが指定されました: .${command} ${serverId}`);
        return true;
    }

    // コマンドメッセージを削除
    await message.delete().catch(err => logger.warn('コマンドメッセージの削除に失敗しました。', err));

    if (command === 'sb') {
        await addServerToBlacklist(serverId);
    } else if (command === 'sub') {
        await removeServerFromBlacklist(serverId);
    }

    return true; // ブラックリストコマンドとして処理完了
}

module.exports = {
    initAndPollBlacklist,
    isServerBlacklisted,
    handleBlacklistCommand,
};