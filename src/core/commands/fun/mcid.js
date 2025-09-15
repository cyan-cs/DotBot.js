const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const logger = require('../../utils/logger');
const { addMessageId } = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mcid')
    .setDescription('指定されたMinecraftユーザーの情報を取得します')
    .addStringOption(option =>
      option.setName('text')
        .setDescription('Minecraft IDを入力')
        .setRequired(true)
    ),

  async executeSlash(interaction) {
    const username = interaction.options.getString('text');
    const apiUrl = `https://api.ashcon.app/mojang/v2/user/${encodeURIComponent(username)}`;

    await interaction.deferReply({ ephemeral: false });

    try {
      const response = await axios.get(apiUrl);
      const data = response.data;

      const skinUrlFace = `https://crafthead.net/skin/${username}`;
      const skinUrlBody = `https://minotar.net/armor/body/${username}/100.png`;

      const nameHistory = (data.username_history || []).map((entry, i) =>
        `**${i + 1}:** ${entry.username}`
      ).join('\n') || '名前の履歴はありません。';

      const embed = new EmbedBuilder()
        .setTitle(`🎮 Minecraftユーザー情報`)
        .addFields(
          { name: 'ユーザー名', value: data.username, inline: true },
          { name: 'UUID', value: data.uuid, inline: true },
          { name: '名前の変更履歴', value: nameHistory, inline: false }
        )
        .setThumbnail(skinUrlFace)
        .setImage(skinUrlBody)
        .setColor(0x00cc99)
        .setFooter({ text: `検索者: ${interaction.user.tag}` });

      // メッセージ送信（編集済みリプライ取得）
      const sentMsg = await interaction.editReply({ embeds: [embed], fetchReply: true });

      // 🗑️ リアクション追加 & jsonStoreにID保存
      await sentMsg.react('🗑️');
      await addMessageId(sentMsg.id);

    } catch (err) {
      logger.error('mcid コマンド エラー:', err);

      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ エラー')
        .setDescription(
          err.response?.status === 404
            ? `ユーザー "${username}" は見つかりませんでした。MCIDを確認してください。`
            : '情報取得に失敗しました。しばらくしてから再度お試しください。'
        )
        .setColor(0xff0000);

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};
