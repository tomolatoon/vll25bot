import {
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandSubcommandBuilder,
    EmbedBuilder, // Added
} from "discord.js";
import { handleReminderCancel } from "../../lib/remind-handlers";
import { REMIND_COLOR_SUCCESS } from "../../lib/remind-ui"; // Added

export const cancelCommand = new SlashCommandSubcommandBuilder()
    .setName("cancel")
    .setDescription("リマインダーを解除します")
    .addStringOption((option) =>
        option
            .setName("id")
            .setDescription("解除するリマインダーのID")
            .setRequired(true),
    );

/** リマインダー解除 */
export async function handleCancel(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    const id = interaction.options.getString("id", true);
    if (!interaction.guildId) return;

    // handleReminderCancel は削除と元メッセージ更新を行う
    const result = await handleReminderCancel(interaction, id);

    if (!result.success) {
        if (result.reason === "not_owner") {
            await interaction.reply({
                content: "❌ 自分が登録したリマインダーのみ解除できます。",
                flags: MessageFlags.Ephemeral,
            });
        } else {
            // not_found, already_done
            await interaction.reply({
                content: `❓ リマインダー \`${id}\` は既に解除済みか存在しません。`,
                flags: MessageFlags.Ephemeral,
            });
        }
        return;
    }

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(REMIND_COLOR_SUCCESS)
                .setTitle("🗑️ リマインダー解除")
                .setDescription(`リマインダー \`${id}\` を解除しました。`),
        ], // Changed
        flags: MessageFlags.Ephemeral,
    });
}
