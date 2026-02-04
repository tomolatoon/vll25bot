import {
    ChannelType,
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandSubcommandBuilder,
    type TextChannel,
} from "discord.js";
import {
    type ListState,
    type SortOrder,
    filterAndSortReminders,
    getPageItems,
    getTotalPages,
} from "../../lib/remind-list";
import {
    buildActionButtons,
    buildListEmbed, // Changed
    buildOtherNavButtons,
    buildPaginationButtons,
    buildSelectMenu,
} from "../../lib/remind-ui";
import { getRemindersByGuild } from "../../reminder";

export const listCommand = new SlashCommandSubcommandBuilder()
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

/** リマインダー一覧 */
export async function handleList(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    if (!interaction.guildId) return;

    const targetChannel = interaction.options.getChannel(
        "channel",
    ) as TextChannel | null;
    const targetUser = interaction.options.getUser("user");
    const order =
        (interaction.options.getString("order") as SortOrder | null) || "asc";

    // ページネーション状態を初期化
    const state: ListState = {
        page: 0,
        order,
        channelId: targetChannel?.id,
        // user 省略時は自分のみ表示
        userId: targetUser?.id ?? interaction.user.id,
        guildId: interaction.guildId,
    };

    // リマインダーを取得・フィルター・ソート
    const allReminders = getRemindersByGuild(interaction.guildId);
    const filtered = filterAndSortReminders(allReminders, state);
    const totalPages = getTotalPages(filtered.length);
    const pageItems = getPageItems(filtered, state.page);

    if (filtered.length === 0) {
        await interaction.reply({
            content: "📭 リマインダーはありません。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // メッセージを構築
    const embed = buildListEmbed(pageItems, state, totalPages); // Changed
    const selectMenu = buildSelectMenu(pageItems, state);
    const actionButtons = buildActionButtons(state);
    const navButtons = buildPaginationButtons(state, totalPages);
    const otherNavButtons = buildOtherNavButtons(state);

    await interaction.reply({
        embeds: [embed], // Changed
        components: [selectMenu, actionButtons, navButtons, otherNavButtons],
        flags: MessageFlags.Ephemeral,
    });
}
