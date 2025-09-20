require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { SimpleShardingStrategy } = require('@discordjs/ws');
const logger = require('./core/utils/logger.js');
const { handleError } = require('./core/events/Handler/errorHandlings.js');
const { loadCommandCollection, registerGlobalCommands, registerGuildCommands } = require('./core/utils/commands-manager.js');
const { initDatabase } = require('./core/utils/database.js');
const { initAndPollBlacklist } = require('./core/utils/blacklist.js');

const { TOKEN } = process.env;

let client = null;

// モバイル偽装用カスタムシャーディング戦略
class MobileSimpleShardingStrategy extends SimpleShardingStrategy {
    constructor(manager) {
        // IdentifyプロパティをiOSに偽装
        manager.options.identifyProperties = {
            os: 'ios',
            browser: 'Discord iOS',
            device: 'iPhone'
        };
        super(manager);
    }
}

async function main() {
    if (!TOKEN) {
        logger.error('TOKENが.envファイルに設定されていません。ボットは起動を中止します。');
        process.exit(1);
    }

    // ログディレクトリ、データベース、ブラックリストを初期化
    await logger.ensureLogDirectory();
    initDatabase();
    await initAndPollBlacklist();

    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildModeration,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.MessageContent,
        ],
        partials: [Partials.Message, Partials.Channel, Partials.Reaction],
        ws: {
            buildStrategy: manager => new MobileSimpleShardingStrategy(manager)
        },
    });

    // 1. コマンドを読み込む
    const { globalCommands, guildCommands, prefixCommands } = await loadCommandCollection(); // Add prefixCommands
    if (globalCommands.size === 0 && guildCommands.size === 0 && prefixCommands.size === 0) { // Update warning condition
        logger.warn('読み込むコマンドがありませんでした。'); // Update warning message
    }
// ...
    // コマンドをクライアントインスタンスにアタッチ
    client.commands = globalCommands; // グローバルスラッシュコマンドをアタッチ
    client.guildCommands = guildCommands; // ギルドスラッシュコマンドをアタッチ
    client.prefixCommands = prefixCommands; // プレフィックスコマンドをアタッチ

    // 4. イベントハンドラを登録
    const eventsPath = path.join(__dirname, 'core', 'events');
    let eventFiles = [];
    try {
        if (fs.existsSync(eventsPath)) {
            eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        } else {
            logger.warn(`イベントディレクトリ(${eventsPath})が見つかりませんでした。`);
        }
    } catch (error) {
        logger.error(`イベントファイルの読み込み中にエラーが発生しました: ${eventsPath}`, error);
    }

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            const event = require(filePath);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
        } catch (error) {
            logger.error(`イベントファイル(${filePath})の登録中にエラーが発生しました。`, error);
        }
    }
    logger.info(`📦 ${eventFiles.length}件のイベントを読み込みました。`);

    // 5. ボットをログインさせる
    try {
        await client.login(TOKEN);
        logger.info(`✅ Bot にログインしました: ${client.user?.tag ?? '(不明なユーザー)'}`);
    } catch (error) {
        logger.error('Botのログインに失敗しました:', error);
        process.exit(1);
    }
}

// グローバルなエラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
    handleError(reason, { type: 'unhandledRejection', promise });
});

process.on('uncaughtException', (error, origin) => {
    handleError(error, { type: 'uncaughtException', origin });
    // uncaughtException の後はプロセスを終了するのがベストプラクティス
    process.exit(1);
});

main();
