const { promises: fs } = require('fs');
const path = require('path');
const winston = require('winston');

// ログファイルの格納ディレクトリ
const logsDir = path.join(__dirname, '../../..', 'logs');

// ログレベルごとの色を設定
winston.addColors({
    error: 'red',
    warn: 'yellow',
    info: 'white',
    debug: 'green'
});

// 呼び出し元ファイルと行番号を取得するヘルパー関数
const getCallerInfo = () => {
    const stack = new Error().stack.split('\n');
    // Start from index 3 to skip the Error message and the getCallerInfo call itself
    for (let i = 3; i < stack.length; i++) {
        const callerLine = stack[i];
        if (!callerLine) continue;

        // Common stack trace format: "at functionName (filePath:line:column)"
        let match = callerLine.match(/at .* \((.+?):(\d+):(\d+)\)/);

        // Alternative format: "at filePath:line:column" (without function name)
        if (!match) {
            match = callerLine.match(/at (.+?):(\d+):(\d+)/);
        }

        if (match && match[1]) {
            // Return the basename of the file, line number, and column number
            return `${path.basename(match[1])}:${match[2]}`;
        }
    }
    return 'unknown';
};

// ファイル保存用のフォーマット
const fileFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    return stack ? `${logMessage}\n${stack}` : logMessage;
});

// コンソール表示用のフォーマット
const consoleFormat = winston.format.printf(({ level, message, stack }) => {
    const caller = getCallerInfo(); // コンソールログではcaller情報を表示
    const logMessage = `[${level}] [${caller}] ${message}`;
    return stack ? `${logMessage}\n${stack}` : logMessage;
});

// winston ロガー設定
const logger = winston.createLogger({
    level: 'debug', // デフォルトのログレベル
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }) // エラーオブジェクトからスタックトレースを自動抽出
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({ level: true }),
                consoleFormat
            ),
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            format: fileFormat,
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'all.log'),
            format: fileFormat,
        }),
    ],
});

// ログディレクトリの初期化
async function ensureLogDirectory() {
    try {
        await fs.mkdir(logsDir, { recursive: true });
    } catch (err) {
        console.error('❌ ログディレクトリの作成に失敗しました:', err);
    }
}

module.exports = {
    info: (msg) => logger.info(msg),
    warn: (msg) => logger.warn(msg),
    error: (msg, err) => logger.error(msg, err), // errオブジェクトを直接渡す
    debug: (msg) => logger.debug(msg),
    ensureLogDirectory,
};
