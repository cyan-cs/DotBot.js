const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('指定したユーザーをKickします (管理者専用)')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Kickするユーザーを指定してください。')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Kickの理由を指定してください。')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('del')
                .setDescription('Kickされたユーザーのメッセージを削除します (true/false)')
                .setRequired(false)
        ),

    async execute(guild, targetId, reason, delMessages, replyMethod) {
        if (!targetId) {
            return replyMethod('指定されたユーザーはこのサーバーにいません。');
        }

        let target;
        try {
            target = await guild.members.fetch(targetId);
        } catch (error) {
            return replyMethod('指定されたユーザーはこのサーバーにいません。');
        }

        const targetTag = target.user.tag;
        const kickReason = reason || '不適切な行動';

        try {
            // ユーザーにKick通知を送る
            await target.send({
                embeds: [
                    {
                        color: 0xff0000,
                        title: 'Kick通知',
                        description: `あなたはサーバー「${guild.name}」からKickされました。`,
                        fields: [
                            { name: '理由', value: kickReason }
                        ],
                        timestamp: new Date(),
                    },
                ],
            }).catch(err => console.warn('Failed to send DM to the user:', err));

            // メッセージ削除処理
            if (delMessages) {
                let messagesToDelete = [];

                // GUILD_TEXT チャンネルのみ対象
                const channels = guild.channels.cache.filter(channel => channel.type === 'GUILD_TEXT');
                for (const channel of channels.values()) {
                    try {
                        const fetchedMessages = await channel.messages.fetch({ limit: 100 });
                        const userMessages = fetchedMessages.filter(msg => msg.author.id === targetId);
                        messagesToDelete = messagesToDelete.concat(Array.from(userMessages.values()));
                    } catch (err) {
                        console.warn(`Error fetching messages from channel ${channel.name}:`, err);
                    }
                }

                // メッセージを削除
                await Promise.all(messagesToDelete.slice(0, 100).map(msg => msg.delete()));  // 最大100件削除
            }

            // Kick処理
            await target.kick(kickReason);
            await replyMethod(`${targetTag} (ID:${target.id}) をKickしました。`);
        } catch (error) {
            console.error('Error during kick process:', error);
            return replyMethod('Kick処理中にエラーが発生しました。');
        }
    },

    async executeSlash(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: 'あなたにはこのコマンドを使用する権限がありません。', flags: MessageFlags.Ephemeral });
        }

        const guild = interaction.guild;
        const targetId = interaction.options.getUser('target').id;
        const reason = interaction.options.getString('reason');
        const delMessages = interaction.options.getBoolean('del') || false;

        await this.execute(guild, targetId, reason, delMessages, (msg) => interaction.reply(msg));
    },

    async executeMessage(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return message.reply('あなたにはこのコマンドを使用する権限がありません。');
        }

        const guild = message.guild;
        const targetId = args[0].replace(/\D/g, ''); // ID部分を抽出
        const reason = args[1];
        const delMessages = args[2]?.toLowerCase() === 'true' || false;

        await this.execute(guild, targetId, reason, delMessages, (msg) => message.reply(msg));
    },
};
