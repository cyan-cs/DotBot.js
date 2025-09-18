require('dotenv').config();
const { promises: fsPromises } = require('fs');
const path = require('path');
const { REST, Routes, Collection } = require('discord.js');
const logger = require('./logger.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

/**
 * コマンドファイルを再帰的に探索し、Collectionとして読み込む
 * @returns {{globalCommands: Collection<string, object>, guildCommands: Map<string, Collection<string, object>>}} コマンド名とコマンドデータを持つCollection
 */
async function loadCommandCollection() {
    const globalCommands = new Collection(); // For global slash commands
    const guildCommands = new Map(); // For guild-specific slash commands
    const prefixCommands = new Collection(); // For prefix commands
    const commandsPath = path.join(__dirname, '..', 'commands');

    try {
        await fsPromises.access(commandsPath);
    } catch (error) {
        if (error.code === 'ENOENT') {
            logger.warn(`コマンドディレクトリ('${commandsPath}')が見つかりません。コマンドは読み込まれません。`);
            return { globalCommands, guildCommands, prefixCommands };
        }
        throw error;
    }

    const commandFolders = (await fsPromises.readdir(commandsPath, { withFileTypes: true }))
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        const commandFiles = (await fsPromises.readdir(folderPath))
            .filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            try {
                const command = require(filePath);
                // Logic for Slash Commands
                if ('data' in command && typeof command.data.toJSON === 'function' && typeof command.executeSlash === 'function') {
                    if (command.guildOnly && command.targetGuildId) {
                        if (!guildCommands.has(command.targetGuildId)) {
                            guildCommands.set(command.targetGuildId, new Collection());
                        }
                        guildCommands.get(command.targetGuildId).set(command.data.name, command);
                        logger.debug(`ギルドスラッシュコマンドを読み込みました: ${command.data.name} for guild ${command.targetGuildId}`);
                    } else {
                        globalCommands.set(command.data.name, command);
                        logger.debug(`グローバルスラッシュコマンドを読み込みました: ${command.data.name}`);
                    }
                } else if (command.prefixCommand === true && typeof command.executeMessage === 'function') { // Add logic for Prefix Commands
                    const commandName = command.data?.name || path.parse(file).name; // Use file name if data.name is not present
                    prefixCommands.set(commandName, command);
                    logger.debug(`プレフィックスコマンドを読み込みました: ${commandName}`);
                } else {
                    logger.warn(`コマンド(${filePath})は有効なスラッシュコマンドまたはプレフィックスコマンドではありません。`);
                }
            } catch (error) {
                logger.error(`コマンド(${filePath})の読み込みに失敗しました:`, error);
            }
        }
    }
    return { globalCommands, guildCommands, prefixCommands };
}

/**
 * グローバルコマンドを登録し、キャッシュファイルを作成する
 * @param {Collection<string, object>} commands - 登録するコマンドのCollection
 */
async function registerGlobalCommands(commands) {
    if (!TOKEN) {
        logger.error('TOKENが.envに設定されていません。グローバルコマンドの登録をスキップします。');
        return;
    }
    if (!CLIENT_ID) {
        logger.error('CLIENT_IDが.envに設定されていません。グローバルコマンドの登録をスキップします。');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    const commandData = commands.map(cmd => cmd.data.toJSON());
    const cachePath = path.join(__dirname, '..', '..', 'data', 'commands-cache.json');

    try {
        logger.info(`${commandData.length}個のグローバルコマンドの登録を開始します...`);

        const registeredCommands = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commandData },
        );

        logger.info(`${registeredCommands.length}個のグローバルコマンドの登録に成功しました。`);

        const cacheData = registeredCommands.map(({ id, name }) => ({ name, id }));

        // dataディレクトリが存在しない場合は作成
        const dataDir = path.dirname(cachePath);
        try {
            await fsPromises.access(dataDir); // Check if directory exists
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fsPromises.mkdir(dataDir, { recursive: true }); // Create directory if it doesn't exist
            } else {
                throw error; // Re-throw other errors
            }
        }

        await fsPromises.writeFile(cachePath, JSON.stringify(cacheData, null, 2)); // Use fsPromises.writeFile
        logger.info(`コマンドキャッシュを'${cachePath}'に保存しました。`);

    } catch (error) {
        logger.error('グローバルコマンドの登録に失敗しました:', error);
        // Discord APIからのエラーレスポンスを詳細にログ出力
        if (error.response) {
            logger.error(`Discord APIエラー: Status=${error.status}, Data=${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
}

/**
 * ギルド固有コマンドを登録する
 * @param {string} guildId - コマンドを登録するギルドのID
 * @param {Collection<string, object>} commands - 登録するコマンドのCollection
 */
async function registerGuildCommands(guildId, commands) {
    if (!TOKEN) {
        logger.error('TOKENが.envに設定されていません。ギルドコマンドの登録をスキップします。');
        return;
    }
    if (!CLIENT_ID) {
        logger.error('CLIENT_IDが.envに設定されていません。ギルドコマンドの登録をスキップします。');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    const commandData = commands.map(cmd => cmd.data.toJSON());

    try {
        logger.info(`${commandData.length}個のギルドコマンドをギルド ${guildId} に登録を開始します...`);

        const registeredCommands = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, guildId),
            { body: commandData },
        );

        logger.info(`${registeredCommands.length}個のギルドコマンドをギルド ${guildId} に登録に成功しました。`);

    } catch (error) {
        logger.error(`ギルドコマンドの登録に失敗しました (ギルドID: ${guildId}):`, error);
        if (error.response) {
            logger.error(`Discord APIエラー: Status=${error.status}, Data=${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
}

module.exports = {
    loadCommandCollection,
    registerGlobalCommands,
    registerGuildCommands,
};