const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { addRolePanel } = require('../../utils/database.js');
const logger = require('../../utils/logger.js');

/**
 * @type {import('../command.js').Command}
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('ロールパネルを作成します。')
        .addRoleOption(option => option.setName('role1').setDescription('ロール1を指定してください。').setRequired(true))
        .addRoleOption(option => option.setName('role2').setDescription('ロール2を指定してください。').setRequired(false))
        .addRoleOption(option => option.setName('role3').setDescription('ロール3を指定してください。').setRequired(false))
        .addRoleOption(option => option.setName('role4').setDescription('ロール4を指定してください。').setRequired(false))
        .addRoleOption(option => option.setName('role5').setDescription('ロール5を指定してください。').setRequired(false))
        .addStringOption(option => option.setName('title').setDescription('パネルのタイトルを指定します。').setRequired(false))
        .addStringOption(option => option.setName('description').setDescription('パネルの説明を指定します。').setRequired(false)),

    /**
     * スラッシュコマンドでロールパネルを作成します。
     * @param {import('discord.js').ChatInputCommandInteraction}
     */
    async executeSlash(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: 'このコマンドを使用するには、ロールの管理権限が必要です。', flags: MessageFlags.Ephemeral });
        }

        const roles = [];
        for (let i = 1; i <= 5; i++) {
            const role = interaction.options.getRole(`role${i}`);
            if (role) roles.push(role);
        }

        if (roles.length === 0) {
            return interaction.reply({ content: '少なくとも1つのロールを指定してください。', flags: MessageFlags.Ephemeral });
        }

        const options = roles.map(role => ({
            label: role.name,
            value: role.id,
            description: `このロールを付与/剥奪します。`
        }));

        const customId = `role-panel_${interaction.guild.id}`;
        const menu = new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder('ここからロールを選択')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(menu);

        const title = interaction.options.getString('title') || 'ロール選択パネル';
        const description = interaction.options.getString('description') || '下のメニューからロールを選択してください。';

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor('Blue')
            .addFields({ name: '選択可能なロール', value: roles.map(r => `<@&${r.id}>`).join('\n') });

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const sentMessage = await interaction.channel.send({ embeds: [embed], components: [row] });

            const panelData = {
                messageId: sentMessage.id,
                channelId: interaction.channel.id,
                guildId: interaction.guild.id,
                roles: roles.map(role => ({ id: role.id, name: role.name }))
            };

            await addRolePanel(panelData);
            logger.info(`新しいロールパネルが作成されました: ${sentMessage.id} in guild ${interaction.guild.id}`);

            await interaction.editReply({ content: 'ロールパネルを正常に作成しました。' });

        } catch (error) {
            logger.error('ロールパネルの作成またはDBへの保存中にエラーが発生しました:', error);
            await interaction.editReply({ content: 'エラーにより、ロールパネルの作成に失敗しました。' });
        }
    }
};