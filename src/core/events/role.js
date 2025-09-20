const { EmbedBuilder, StringSelectMenuInteraction, GuildMember, MessageFlags } = require('discord.js');
const logger = require('../utils/logger.js');
const { getAllRolePanels } = require('../utils/database.js');
const { logUserAction } = require('./Handler/eventHandlings.js');

/**
 * ロール付与・剥奪のインタラクションを処理します。
 * @param {StringSelectMenuInteraction} interaction - ロール選択メニューのインタラクション
 * @param {string} roleId - 対象のロールID
 * @param {GuildMember} member - 対象のメンバー
 */
async function handleRoleInteraction(interaction, roleId, member) {
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
        return interaction.reply({ content: '指定されたロールが見つかりませんでした。', flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder();
    try {
        let actionType;
        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(role);
            embed.setDescription(`<@&${roleId}> を剥奪しました。`).setColor('Red');
            actionType = "ROLE_REMOVE";
        } else {
            await member.roles.add(role);
            embed.setDescription(`<@&${roleId}> を付与しました。`).setColor('Green');
            actionType = "ROLE_ADD";
        }

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        logUserAction("ROLE_PANEL", `${actionType}: ${role.name} (ID: ${roleId})`, member.user, interaction.guild);
    } catch (error) {
        logger.error('ロールの操作中にエラーが発生しました:', error);
        await interaction.reply({ content: 'ロールの操作中にエラーが発生しました。権限が不足している可能性があります。', flags: MessageFlags.Ephemeral });
    }
}

module.exports = {
    name: 'interactionCreate',
    /**
     * interactionCreateイベントを処理します。
     * @param {import('discord.js').Interaction} interaction
     */
    async execute(interaction) {
        if (!interaction.isStringSelectMenu() || !interaction.customId.startsWith('role-panel_')) return;

        const roleId = interaction.values[0];
        const member = interaction.member;

        await handleRoleInteraction(interaction, roleId, member);
    },

    /**
     * データベースからロールパネルを読み込み、イベントリスナーを再設定します。
     * @param {import('discord.js').Client} client
     */
    async loadPanels(client) {
        logger.info('データベースからロールパネルを読み込んでいます...');
        try {
            const panels = await getAllRolePanels();

            for (const panel of panels) {
                try {
                    const channel = await client.channels.fetch(panel.channel_id).catch(() => null);
                    if (!channel) {
                        logger.warn(`パネルのチャンネルが見つかりません: ${panel.channel_id}`);
                        continue;
                    }

                    const message = await channel.messages.fetch(panel.message_id).catch(() => null);
                    if (!message) {
                        logger.warn(`パネルのメッセージが見つかりません: ${panel.message_id}`);
                        continue;
                    }

                    // 既存のコレクターをリフレッシュするために、新しいコレクターを作成
                    const collector = message.createMessageComponentCollector({ componentType: 'SELECT_MENU' });
                    collector.on('collect', async (i) => {
                        if (!i.isStringSelectMenu() || !i.customId.startsWith('role-panel_')) return;
                        await handleRoleInteraction(i, i.values[0], i.member);
                    });

                } catch (error) {
                    logger.error(`ロールパネル(CH: ${panel.channel_id}, MSG: ${panel.message_id})の読み込みに失敗しました。`, error);
                }
            }
            logger.info(`${panels.length}件のロールパネルを正常に読み込みました。`);
        } catch (error) {
            logger.error('データベースからのロールパネルの読み込みに失敗しました:', error);
        }
    }
};
