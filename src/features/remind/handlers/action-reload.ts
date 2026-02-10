import type { ButtonHandler } from "@core/types";
import { type ButtonInteraction, EmbedBuilder } from "discord.js";
import { buildReminderButtons } from "../components/actions";
import {
    buildReminderDetailEmbed,
    buildReminderEmbed,
} from "../components/embeds";
import { BUTTON_ID_REMIND_RELOAD, REMIND_COLOR_INFO } from "../constants";
import { reminderService } from "../services/reminder-service";

export const reloadHandler: ButtonHandler = {
    idPrefix: BUTTON_ID_REMIND_RELOAD,
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
