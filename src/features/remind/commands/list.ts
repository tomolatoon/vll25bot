import {
    type ActionRowBuilder,
    type ButtonBuilder,
    ChannelType,
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandSubcommandBuilder,
    type StringSelectMenuBuilder,
    type TextChannel,
} from "discord.js";
import {
    buildActionButtons,
    buildOtherNavButtons,
    buildPaginationButtons,
    buildSelectMenu,
} from "../components/actions";
import { buildListEmbed } from "../components/embeds";
import { reminderService } from "../services/reminder-service";
import {
    type ListState,
    type SortOrder,
    filterAndSortReminders,
    getPageItems,
    getTotalPages,
} from "../utils/list";

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
    if (!interaction.guildId) return;

    const targetChannel = interaction.options.getChannel(
        "channel",
    ) as TextChannel | null;
    const targetUser = interaction.options.getUser("user");
    const order =
        (interaction.options.getString("order") as SortOrder | null) || "asc";

    const state: ListState = {
        page: 0,
        order,
        channelId: targetChannel?.id,
        userId: targetUser?.id ?? interaction.user.id,
        guildId: interaction.guildId,
    };

    const allReminders = await reminderService.getByGuild(interaction.guildId);
    const filtered = filterAndSortReminders(allReminders, state);
    const totalPages = getTotalPages(filtered.length);
    const pageItems = getPageItems(filtered, state.page);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const embed = buildListEmbed(pageItems, state, totalPages);

    const components: (
        | ActionRowBuilder<StringSelectMenuBuilder>
        | ActionRowBuilder<ButtonBuilder>
    )[] = [];
    if (pageItems.length > 0) {
        components.push(buildSelectMenu(pageItems, state));
        components.push(buildActionButtons(state));
    }
    components.push(buildPaginationButtons(state, totalPages));
    components.push(buildOtherNavButtons(state));

    await interaction.editReply({
        embeds: [embed],
        components: components,
    });
}

export default { data, execute };
