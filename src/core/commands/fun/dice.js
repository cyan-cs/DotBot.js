const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { addMessageId } = require('../../utils/database.js');
const logger = require('../../utils/logger.js');

const SIDES_MIN = 2;
const SIDES_MAX = 1000;
const COUNT_MIN = 1;
const COUNT_MAX = 100;

module.exports = {
    prefixCommand: true,
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('サイコロを振ります')
        .addIntegerOption(option =>
            option.setName('sides')
                .setDescription('サイコロの面数を指定します (2~1000)')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('サイコロの個数を指定します (1~100)')
                .setRequired(true)
        ),
    /**
     * サイコロを振る共通ロジック
     * @param {number} sidesInput - サイコロの面数
     * @param {number} countInput - サイコロの個数
     * @param {(msg: object) => Promise<import('discord.js').Message>} replyMethod - 返信を行う関数
     */
    async execute(sidesInput, countInput, replyMethod) {
        try {
            const sides = Math.max(SIDES_MIN, Math.min(sidesInput, SIDES_MAX));
            const count = Math.max(COUNT_MIN, Math.min(countInput, COUNT_MAX));

            function roll(diceSides) {
                return Math.floor(Math.random() * diceSides) + 1;
            }

            const result = Array.from({ length: count }, () => roll(sides));
            const total = result.reduce((sum, value) => sum + value, 0);

            const embed = new EmbedBuilder()
                .setColor('#0099ff') // 青
                .setTitle('🎲 サイコロの結果')
                .setTimestamp();

            if (count >= 15) {
                const resultChunks = [];
                for (let i = 0; i < result.length; i += 15) {
                    resultChunks.push(result.slice(i, i + 15).join(', '));
                }

                embed.setDescription(`サイコロの結果の合計は **${total}** です！`)
                    .addFields({ name: '詳細', value: resultChunks.join('\n') });
            } else {
                embed.setDescription(`サイコロの結果は以下の通りです。`)
                    .addFields(
                        { name: '結果', value: result.join(', '), inline: false },
                        { name: '合計', value: `**${total}**`, inline: false }
                    );
            }

            const sentMessage = await replyMethod({ embeds: [embed], fetchReply: true });
            await sentMessage.react('🗑️');
            await addMessageId(sentMessage.id);
        } catch (error) {
            logger.error('diceコマンドの実行中にエラーが発生しました。', error);
            // エラー時の返信は呼び出し元で処理されることを想定
        }
    },
    /**
     * スラッシュコマンド /dice を実行します。
     * @param {import('discord.js').ChatInputCommandInteraction} interaction - インタラクションオブジェクト
     */
    async executeSlash(interaction) {
        try {
            await this.execute(
                interaction.options.getInteger('sides'),
                interaction.options.getInteger('count'),
                (msg) => interaction.reply(msg)
            );
        } catch (error) {
            logger.error('スラッシュコマンド /dice の実行中にエラーが発生しました。', error);
            await interaction.reply({ content: 'サイコロを振る際にエラーが発生しました。', flags: MessageFlags.Ephemeral });
        }
    },
    /**
     * プレフィックスコマンド .dice を実行します。
     * @param {import('discord.js').Message} message - メッセージオブジェクト
     * @param {string[]} args - コマンド引数
     */
    async executeMessage(message, parsedArgs) {
        try {
            // Expect parsedArgs to be an object like { sides: number, count: number }
            const { sides, count } = parsedArgs;

            await this.execute(
                sides,
                count,
                (msg) => message.reply(msg)
            );
        } catch (error) {
            logger.error('プレフィックスコマンド .dice の実行中にエラーが発生しました。', error);
            await message.reply('サイコロを振る際にエラーが発生しました。').catch(() => {});
        }
    }
};
