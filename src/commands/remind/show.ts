import {
    type ChatInputCommandInteraction,
    SlashCommandSubcommandBuilder,
} from "discord.js";
import { handleReminderShow } from "../../lib/remind-handlers";

export const showCommand = new SlashCommandSubcommandBuilder()
    .setName("show")
    .setDescription("リマインダーの詳細を表示します")
    .addStringOption((option) =>
        option
            .setName("id")
            .setDescription("表示するリマインダーのID")
            .setRequired(true),
    );

/** リマインダー詳細表示 */
export async function handleShow(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    if (!interaction.guildId) return;

    const id = interaction.options.getString("id", true);
    await handleReminderShow(interaction, id);
}
