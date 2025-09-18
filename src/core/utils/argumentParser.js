/**
 * コマンド引数を定義に基づいて解析します。
 * @param {string[]} rawArgs - 生の引数配列
 * @param {object[]} argDefinitions - 引数定義の配列
 * @returns {object} 解析された引数オブジェクト
 */
function parseCommandArgs(rawArgs, argDefinitions) {
    const parsedArgs = {};
    if (!argDefinitions) {
        return rawArgs; // 定義がない場合は生の引数をそのまま返す
    }

    for (let i = 0; i < argDefinitions.length; i++) {
        const def = argDefinitions[i];
        let value = rawArgs[i];

        if (value === undefined) {
            if (def.required) {
                // 必須引数が不足している場合はエラーをスロー
                throw new Error(`Missing required argument: ${def.name}`);
            }
            parsedArgs[def.name] = def.default; // デフォルト値を適用
            continue;
        }

        // 型変換
        switch (def.type) {
            case 'integer':
                value = parseInt(value, 10);
                if (isNaN(value)) {
                    throw new Error(`Argument '${def.name}' must be an integer.`);
                }
                break;
            case 'boolean':
                const lowerValue = value.toLowerCase();
                value = lowerValue === 'true' || lowerValue === 't' || lowerValue === 'yes' || lowerValue === 'y';
                break;
            // 'string' はそのまま
        }
        parsedArgs[def.name] = value;
    }
    return parsedArgs;
}

module.exports = { parseCommandArgs };
