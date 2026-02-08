import {
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandSubcommandBuilder,
} from "discord.js";
import type { Command } from "../../../core/types";
import { reminderService } from "../reminder-service";
import { buildReminderButtons, buildReminderDetailEmbed } from "../utils/ui";

const data = new SlashCommandSubcommandBuilder()
    .setName("show")
    .setDescription("リマインダーの詳細を表示します")
    .addStringOption((option) =>
        option.setName("id").setDescription("リマインダーID").setRequired(true),
    );

async function execute(interaction: ChatInputCommandInteraction) {
    const id = interaction.options.getString("id", true);
    if (!interaction.guildId) return;

    const reminder = await reminderService.getReminderById(id);

    if (!reminder) {
        await interaction.reply({
            content: `❌ リマインダー \`${id}\` が見つかりません。`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Check guild if necessary (optional, reminders are by ID)
    if (reminder.guildId !== interaction.guildId) {
        await interaction.reply({
            content: "❌ 他のサーバーのリマインダーは表示できません。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const embed = buildReminderDetailEmbed(reminder);
    const buttons = buildReminderButtons(reminder.id);

    await interaction.reply({
        embeds: [embed],
        components: [buttons],
        flags: MessageFlags.Ephemeral,
    });
}

export default { data, execute };
