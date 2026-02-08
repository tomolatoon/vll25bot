import {
    type ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../../../core/types";
import { reminderService } from "../reminder-service";
import { buildReminderButtons } from "../components/actions";
import { buildReminderDetailEmbed } from "../components/embeds";
import { REMIND_COLOR_INFO } from "../constants";

export const reminderShow: Command = {
    data: new SlashCommandBuilder()
        .setName("show")
        .setDescription("指定したIDのリマインダー情報を表示します")
        .addStringOption((option) =>
            option
                .setName("id")
                .setDescription("リマインダーID")
                .setRequired(true),
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) return;

        const id = interaction.options.getString("id", true);
        const reminder = await reminderService.getReminderById(id);

        if (!reminder) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(REMIND_COLOR_INFO)
                        .setDescription("❌ 指定されたIDのリマインダーが見つかりません。"),
                ],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (reminder.guildId !== interaction.guildId) {
            await interaction.reply({
                content: "❌ このサーバーのリマインダーではありません。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.reply({
            embeds: [buildReminderDetailEmbed(reminder)],
            components: [buildReminderButtons(reminder.id)],
            flags: MessageFlags.Ephemeral,
        });
    },
};
