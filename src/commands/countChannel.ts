import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  TextChannel,
} from "discord.js";
import { countMessagesInChannel } from "../utils";

export const countChannelCommand = {
  data: new SlashCommandBuilder()
    .setName("count-channel")
    .setDescription("指定したテキストチャンネルの投稿件数をカウントします")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("カウント対象のチャンネル")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const channel = interaction.options.getChannel("channel", true);

    if (channel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: "テキストチャンネルを指定してください。",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const textChannel = channel as TextChannel;
    const count = await countMessagesInChannel(textChannel);

    await interaction.editReply({
      content: `📊 **${channel.name}** の投稿件数: **${count}** 件`,
    });
  },
};
