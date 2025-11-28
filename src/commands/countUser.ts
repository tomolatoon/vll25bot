import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import { countUserMessagesInChannel } from "../utils";

export const countUserCommand = {
  data: new SlashCommandBuilder()
    .setName("count-user")
    .setDescription("指定したユーザーの投稿件数をカウントします")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("カウント対象のユーザー")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("カウント対象のチャンネル（省略時は現在のチャンネル）")
        .setRequired(false)
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.PublicThread,
          ChannelType.PrivateThread
        )
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = interaction.options.getUser("user", true);
    const channelOption = interaction.options.getChannel("channel", false);
    const channel = channelOption ?? interaction.channel;

    if (!channel) {
      await interaction.reply({
        content: "チャンネルが見つかりません。",
        ephemeral: true,
      });
      return;
    }

    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.PublicThread &&
      channel.type !== ChannelType.PrivateThread
    ) {
      await interaction.reply({
        content: "テキストチャンネルまたはスレッドを指定してください。",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const targetChannel = channel as TextChannel | ThreadChannel;
    const count = await countUserMessagesInChannel(targetChannel, user.id);

    const channelName = "name" in channel ? channel.name : "このチャンネル";
    await interaction.editReply({
      content: `📊 **${channelName}** における **${user.username}** の投稿件数: **${count}** 件`,
    });
  },
};
