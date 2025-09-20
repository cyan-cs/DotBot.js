const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('./logger');

const dbPath = path.resolve(__dirname, '../../data/delMessage.db');

// データベース接続を開く
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        logger.error('データベースへの接続に失敗しました。ボットは正常に動作しない可能性があります。', err);
    } else {
        logger.info('データベースに正常に接続しました。');
    }
});

/**
 * データベースの初期化。テーブルが存在しない場合に作成します。
 * @returns {Promise<void>}
 */
function initDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS deletable_messages (
                message_id TEXT PRIMARY KEY
            )`, (err) => {
                if (err) {
                    logger.error('deletable_messagesテーブルの作成に失敗しました。', err);
                    return reject(err);
                }
                logger.info('deletable_messagesテーブルが正常に準備されました。');
            });
    
            db.run(`CREATE TABLE IF NOT EXISTS role_panels (
                message_id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                roles_json TEXT NOT NULL
            )`, (err) => {
                if (err) {
                    logger.error('role_panelsテーブルの作成に失敗しました。', err);
                    return reject(err);
                }
                logger.info('role_panelsテーブルが正常に準備されました。');
            });
            resolve();
        });
    });
}



/**
 * 削除可能なメッセージのIDをデータベースに追加します。
 * @param {string} id - メッセージID
 * @returns {Promise<void>}
 */
function addMessageId(id) {
    const sql = `INSERT OR IGNORE INTO deletable_messages (message_id) VALUES (?)`;
    return new Promise((resolve, reject) => {
        db.run(sql, [id], (err) => {
            if (err) {
                logger.error(`メッセージID(${id})の追加に失敗しました。`, err);
                return reject(err);
            }
            resolve();
        });
    });
}

/**
 * メッセージIDをデータベースから削除します。
 * @param {string} id - メッセージID
 * @returns {Promise<void>}
 */
function removeMessageId(id) {
    const sql = `DELETE FROM deletable_messages WHERE message_id = ?`;
    return new Promise((resolve, reject) => {
        db.run(sql, [id], (err) => {
            if (err) {
                logger.error(`メッセージID(${id})の削除に失敗しました。`, err);
                return reject(err);
            }
            resolve();
        });
    });
}

/**
 * 指定されたメッセージIDが追跡対象かを確認します。
 * @param {string} id - メッセージID
 * @returns {Promise<boolean>} 追跡対象であればtrue
 */
function isMessageTracked(id) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT 1 FROM deletable_messages WHERE message_id = ? LIMIT 1`;
        db.get(sql, [id], (err, row) => {
            if (err) {
                logger.error(`メッセージID(${id})の検索に失敗しました。`, err);
                return reject(err);
            }
            resolve(!!row);
        });
    });
}

/**
 * ロールパネルのデータをデータベースに追加します。
 * @param {object} panelData - ロールパネルのデータ
 * @param {string} panelData.messageId - メッセージID
 * @param {string} panelData.channelId - チャンネルID
 * @param {string} panelData.guildId - ギルドID
 * @param {Array<object>} panelData.roles - ロール情報の配列
 * @returns {Promise<void>}
 */
async function addRolePanel(panelData) {
    const sql = `INSERT INTO role_panels (message_id, channel_id, guild_id, roles_json) VALUES (?, ?, ?, ?)`;
    return new Promise((resolve, reject) => {
        db.run(sql, [panelData.messageId, panelData.channelId, panelData.guildId, JSON.stringify(panelData.roles)], function(err) {
            if (err) {
                logger.error('ロールパネルの追加に失敗しました。', err);
                return reject(err);
            }
            resolve();
        });
    });
}

/**
 * メッセージIDに基づいてロールパネルのデータを取得します。
 * @param {string} messageId - メッセージID
 * @returns {Promise<object|null>} ロールパネルのデータ、またはnull
 */
async function getRolePanelByMessageId(messageId) {
    const sql = `SELECT * FROM role_panels WHERE message_id = ?`;
    return new Promise((resolve, reject) => {
        db.get(sql, [messageId], (err, row) => {
            if (err) {
                logger.error(`ロールパネル(メッセージID: ${messageId})の取得に失敗しました。`, err);
                return reject(err);
            }
            if (row) {
                row.roles = JSON.parse(row.roles_json);
                delete row.roles_json;
            }
            resolve(row);
        });
    });
}

/**
 * すべてのロールパネルのデータを取得します。
 * @returns {Promise<Array<object>>}
 */
async function getAllRolePanels() {
    const sql = `SELECT * FROM role_panels`;
    return new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
            if (err) {
                logger.error('すべてのロールパネルの取得に失敗しました。', err);
                return reject(err);
            }
            const panels = rows.map(row => {
                row.roles = JSON.parse(row.roles_json);
                delete row.roles_json;
                return row;
            });
            resolve(panels);
        });
    });
}

/**
 * ロールパネルのデータを削除します。
 * @param {string} messageId - メッセージID
 * @returns {Promise<void>}
 */
async function deleteRolePanel(messageId) {
    const sql = `DELETE FROM role_panels WHERE message_id = ?`;
    return new Promise((resolve, reject) => {
        db.run(sql, [messageId], function(err) {
            if (err) {
                logger.error(`ロールパネル(メッセージID: ${messageId})の削除に失敗しました。`, err);
                return reject(err);
            }
            resolve();
        });
    });
}

module.exports = {
    initDatabase,
    addMessageId,
    removeMessageId,
    isMessageTracked,
    addRolePanel,
    getRolePanelByMessageId,
    getAllRolePanels,
    deleteRolePanel,
};
