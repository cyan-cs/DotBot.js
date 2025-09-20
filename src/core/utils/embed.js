const { EmbedBuilder } = require('discord.js');

// 色の定数
const COLORS = {
    DEFAULT: 0x00BFFF,
    ERROR: 0xFF0000,
};

function createBaseEmbed(user) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.DEFAULT)
        .setTimestamp();

    if (user) {
        embed.setFooter({
            text: `Requested by ${user.tag}`,
            iconURL: user.displayAvatarURL(),
        });
    }

    return embed;
}

function createErrorEmbed(description) {
    return new EmbedBuilder()
        .setTitle('❌ エラーが発生しました')
        .setDescription(description)
        .setColor(COLORS.ERROR)
        .setTimestamp();
}


function createServerInfoEmbed(guild) {
    return new EmbedBuilder()
        .setColor(COLORS.DEFAULT)
        .setTitle(`${guild.name} の情報`)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 128 }))
        .addFields(
            { name: 'サーバー名', value: guild.name, inline: true },
            { name: 'サーバーID', value: guild.id, inline: true },
            { name: 'メンバー数', value: guild.memberCount.toLocaleString(), inline: true },
            { name: '作成日', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
            { name: 'オーナー', value: `<@${guild.ownerId}>`, inline: true },
            { name: 'ロール数', value: `${guild.roles.cache.size}`, inline: true },
            { name: 'チャンネル数', value: `${guild.channels.cache.size}`, inline: true },
            { name: 'サーバーブーストレベル', value: `${guild.premiumTier || 'なし'}`, inline: true },
            { name: '絵文字の数', value: `${guild.emojis.cache.size}`, inline: true },
            { name: '地域', value: guild.preferredLocale, inline: true }
        )
        .setFooter({ text: 'サーバー情報' })
        .setTimestamp();
}

/**
 * 新しい汎用Embed作成関数
 * @param {object} options
 * @param {string} [options.title] - Embedのタイトル
 * @param {string} [options.description] - Embedの説明
 * @param {import('discord.js').User} [options.user] - フッターに表示するユーザー
 * @param {Array} [options.fields] - Embedに追加するフィールド
 * @param {number} [options.color] - Embedの色
 * @returns {EmbedBuilder}
 */
function createEmbed({ title, description, user, fields, color }) {
    const embed = new EmbedBuilder()
        .setColor(color || COLORS.DEFAULT)
        .setTimestamp();

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (fields) embed.addFields(fields);

    if (user) {
        embed.setFooter({
            text: `Requested by ${user.tag}`,
            iconURL: user.displayAvatarURL(),
        });
    }
    return embed;
}

module.exports = {
    createBaseEmbed,
    createErrorEmbed,
    createServerInfoEmbed,
    createEmbed,
    COLORS,
};