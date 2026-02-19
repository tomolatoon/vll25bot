import { logger } from "@utils/logger";
import {
    ChannelType,
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandSubcommandBuilder,
    type TextChannel,
} from "discord.js";
import { buildReminderListView } from "../services/renderer";
import type { ListState, SortOrder } from "../utils/list";

const data = new SlashCommandSubcommandBuilder()
    .setName("list")
    .setDescription("リマインダー一覧を表示します")
    .addChannelOption((option) =>
        option
            .setName("channel")
            .setDescription("送信先チャンネル（省略で全チャンネル）")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false),
    )
    .addUserOption((option) =>
        option
            .setName("user")
            .setDescription("作成者（省略で自分のみ）")
            .setRequired(false),
    )
    .addStringOption((option) =>
        option
            .setName("order")
            .setDescription("ソート順（省略で昇順）")
            .setRequired(false)
            .addChoices(
                { name: "昇順（古い順）", value: "asc" },
                { name: "降順（新しい順）", value: "desc" },
            ),
    );

async function execute(interaction: ChatInputCommandInteraction) {
    try {
        if (!interaction.guildId) return;

        const targetChannel = interaction.options.getChannel(
            "channel",
        ) as TextChannel | null;
        const targetUser = interaction.options.getUser("user");
        const order =
            (interaction.options.getString("order") as SortOrder | null) ||
            "asc";

        const state: ListState = {
            page: 0,
            order,
            channelId: targetChannel?.id,
            userId: targetUser?.id ?? interaction.user.id,
            guildId: interaction.guildId,
        };

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const { embed, components } = await buildReminderListView(
            interaction.guildId,
            state,
        );

        await interaction.editReply({
            embeds: [embed],
            components: components,
        });
    } catch (error) {
        logger.error("❌ /remind list 実行エラー:", error);
        const content = "❌ コマンドの実行中にエラーが発生しました。";
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content });
        } else {
            await interaction.reply({ content, flags: MessageFlags.Ephemeral });
        }
    }
}

export default { data, execute };
