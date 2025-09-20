const { GuildMember, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const logger = require('../../utils/logger.js');
const { addMessageId } = require('../../utils/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user-i')
        .setDescription('指定したユーザーの情報を表示します。')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('情報を表示するユーザーを指定してください。')
                .setRequired(true)
        ),

    /**
     * 共通のユーザー情報表示ロジック
     * @param {GuildMember|import('discord.js').User} user 
     * @param {(msg: any) => Promise<import('discord.js').Message>} replyMethod 
     */
    async execute(user, replyMethod) {
        try {
            const targetUser = user instanceof GuildMember ? user.user : user;
            const member = user instanceof GuildMember ? user : null;

            const fields = [
                { name: 'ユーザー名', value: targetUser.username, inline: true },
                { name: 'ユーザーID', value: targetUser.id, inline: true },
                { name: 'アカウント作成日', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: false }
            ];

            if (member) {
                fields.push(
                    { name: 'ニックネーム', value: member.nickname || 'なし', inline: true },
                    { name: 'サーバー参加日', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
                    {
                        name: 'ロール',
                        value: member.roles.cache
                            .filter(role => role.name !== '@everyone')
                            .map(role => role.name)
                            .join(', ') || 'なし',
                        inline: false
                    }
                );
            }

            // おしゃれで見やすいEmbed
            const embed = new EmbedBuilder()
                .setColor(0x00BFFF)
                .setTitle(`${targetUser.tag} の情報`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
                .addFields(fields)
                .setFooter({ text: 'ユーザー情報' })
                .setTimestamp();

            logger.info(`User information for ${targetUser.tag} successfully retrieved.`);

            const sentMsg = await replyMethod({ embeds: [embed], fetchReply: true });

            await sentMsg.react('🗑️');
            await addMessageId(sentMsg.id);

        } catch (error) {
            logger.error('Error executing /user-i command:', error);

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('エラー発生')
                .setDescription('コマンドの実行中にエラーが発生しました。')
                .addFields({ name: '詳細', value: `\`${error.message}\`\n\`\`\`${error.stack}\`\`\`` })
                .setFooter({ text: 'ユーザー情報取得失敗' })
                .setTimestamp();

            const errorMsg = await replyMethod({ embeds: [embed], fetchReply: true });
            await errorMsg.react('🗑️');
            await addMessageId(errorMsg.id);
        }
    },

    async executeSlash(interaction) {
        const user = interaction.options.getMember('target') || interaction.options.getUser('target');
        await this.execute(user, (msg) => interaction.reply(msg));
    },

    async executeMessage(message, args) {
        const userId = args[0]?.replace(/\D/g, '');
        if (!userId) {
            const errorMsg = await message.reply('ユーザーIDを指定してください。');
            await errorMsg.react('🗑️');
            await addMessageId(errorMsg.id);
            return;
        }

        let user = await message.guild.members.fetch(userId).catch(() => null) ||
                   await message.client.users.fetch(userId).catch(() => null);

        if (!user) {
            const errorMsg = await message.reply('指定されたユーザーが見つかりませんでした。');
            await errorMsg.react('🗑️');
            await addMessageId(errorMsg.id);
            return;
        }

        await this.execute(user, (msg) => message.reply(msg));
    },
};
