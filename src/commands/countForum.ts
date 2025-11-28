import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  ForumChannel,
} from "discord.js";
import { countThreadsInForum } from "../utils";

export const countForumCommand = {
  data: new SlashCommandBuilder()
    .setName("count-forum")
    .setDescription("指定したフォーラムチャンネルの投稿（スレッド）件数をカウントします")
    .addChannelOption((option) =>
      option
        .setName("forum")
        .setDescription("カウント対象のフォーラムチャンネル")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildForum)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const channel = interaction.options.getChannel("forum", true);

    if (channel.type !== ChannelType.GuildForum) {
      await interaction.reply({
        content: "フォーラムチャンネルを指定してください。",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const forumChannel = channel as ForumChannel;
    const { activeCount, archivedCount, totalCount } =
      await countThreadsInForum(forumChannel);

    await interaction.editReply({
      content: `📊 **${channel.name}** のスレッド件数:\n` +
        `・アクティブ: **${activeCount}** 件\n` +
        `・アーカイブ済み: **${archivedCount}** 件\n` +
        `・合計: **${totalCount}** 件`,
    });
  },
};
