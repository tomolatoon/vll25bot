import {
    type ButtonInteraction,
    EmbedBuilder,
} from "discord.js";
import type { ButtonHandler } from "../../../core/types";
import { reminderService } from "../reminder-service";
import {
    REMIND_COLOR_INFO,
} from "../constants";
import {
    buildReminderButtons,
} from "../components/actions";
import {
    buildReminderDetailEmbed,
    buildReminderEmbed,
} from "../components/embeds";

export const reloadHandler: ButtonHandler = {
    idPrefix: "remind_reload:",
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        await interaction.deferUpdate();
        const reminderId = interaction.customId.split(":")[1];
        const reminder = await reminderService.getReminderById(reminderId);

        if (!reminder) {
            await interaction.editReply({
                content: "",
                embeds: [
                    new EmbedBuilder()
                        .setColor(REMIND_COLOR_INFO)
                        .setDescription(
                            `❓ リマインダー \`${reminderId}\` は既に解除済みです。`,
                        ),
                ],
                components: [],
            });
            return;
        }

        const title = interaction.message.embeds[0]?.title;
        const isDetail = title?.includes("詳細");

        const embed = isDetail
            ? buildReminderDetailEmbed(reminder)
            : buildReminderEmbed(reminder);

        await interaction.editReply({
            embeds: [embed],
            components: [buildReminderButtons(reminder.id)],
        });
    },
};

export default reloadHandler;
