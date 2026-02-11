import {
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandSubcommandBuilder,
} from "discord.js";
import { buildCancelSuccessEmbed } from "../components/embeds";
import { reminderService } from "../services/reminder-service";

const data = new SlashCommandSubcommandBuilder()
    .setName("cancel")
    .setDescription("リマインダーを解除します")
    .addStringOption((option) =>
        option
            .setName("id")
            .setDescription("解除するリマインダーのID")
            .setRequired(true),
    );

async function execute(interaction: ChatInputCommandInteraction) {
    const id = interaction.options.getString("id", true);
    if (!interaction.guildId) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await reminderService.cancel(
        id,
        interaction.user.id,
        interaction.guildId,
    );

    if (!result.success) {
        if (result.reason === "not_owner") {
            await interaction.editReply({
                content: "❌ 自分が登録したリマインダーのみ解除できます。",
            });
        } else {
            await interaction.editReply({
                content: `❓ リマインダー \`${id}\` は既に解除済みか存在しません。`,
            });
        }
        return;
    }

    const { reminder } = result;

    // 完了レスポンス
    await interaction.editReply({
        embeds: [buildCancelSuccessEmbed(reminder)],
    });
}

export default { data, execute };
