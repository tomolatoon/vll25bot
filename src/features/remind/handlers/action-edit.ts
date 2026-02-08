import {
    type ButtonInteraction,
    MessageFlags,
} from "discord.js";
import type { ButtonHandler } from "../../../core/types";
import { reminderService } from "../reminder-service";
import { buildEditReminderModal } from "../components/modals";

export const editHandler: ButtonHandler = {
    idPrefix: "remind_edit:",
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        const reminderId = interaction.customId.split(":")[1];
        const reminder = await reminderService.getReminderById(reminderId);

        if (!reminder) {
            await interaction.reply({
                content: "❌ リマインダーが見つかりません。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (reminder.createdBy !== interaction.user.id) {
            await interaction.reply({
                content: "❌ 自分が登録したリマインダーのみ編集できます。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const modal = buildEditReminderModal(reminderId, reminder.message);
        await interaction.showModal(modal);
    },
};

export default editHandler;
