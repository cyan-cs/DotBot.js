const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { MiQ } = require('makeitaquote');
const { addMessageId } = require('../../utils/database.js');
const logger = require('../../utils/logger.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fmakeit')
    .setDescription('指定した人の名前とアイコンでセリフの偽引用画像を作る')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('ターゲット')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('text')
        .setDescription('ターゲットに言わせる言葉')
        .setRequired(true)),

  /**
   * スラッシュコマンド /fmakeit を実行します。
   * @param {import('discord.js').ChatInputCommandInteraction} interaction - インタラクションオブジェクト
   */
  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('target');
    const text = interaction.options.getString('text');

    try {
      // 生成処理
      const buffer = await new MiQ()
        .setText(text)
        .setAvatar(targetUser.displayAvatarURL({ extension: 'png', size: 128 }))
        .setDisplayname(targetUser.username)
        .setUsername(targetUser.tag)
        .setColor(true)
        .setWatermark(interaction.client.user.tag) // ボットの現在のタグをウォーターマークに設定
        .generate(true);

      // 返信送信
      const sentMessage = await interaction.reply({ files: [{ attachment: buffer, name: 'fakequote.png' }], fetchReply: true });
      await sentMessage.react('🗑️');
      await addMessageId(sentMessage.id);

    } catch (error) {
      logger.error('偽引用画像生成エラー:', error);

      // 例外がAPI通信エラーなら内容を詳しく送る（APIのレスポンスあるなら）
      if (error.response) {
        await interaction.reply({
          content: `画像生成でAPIエラーが発生しました。\nStatus: ${error.response.status}\nMessage: ${JSON.stringify(error.response.data)}`,
          flags: MessageFlags.Ephemeral 
        });
      } else {
        // それ以外は一般エラー通知
        await interaction.reply({ content: '画像生成に失敗しました。' });
      }
    }
  }
};
