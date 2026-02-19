import type { ButtonHandler } from "@core/types";
import { type ButtonInteraction, MessageFlags } from "discord.js";
import { buildEditReminderModal } from "../components/modals";
import { BUTTON_ID_REMIND_EDIT } from "../constants";
import { validateReminderForUpdate } from "../utils/validation";

export const editHandler: ButtonHandler = {
    idPrefix: BUTTON_ID_REMIND_EDIT,
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        const [, reminderId] = interaction.customId.split(":");
        if (!reminderId) return;

        // バリデーション（所有権確認など）
        const validation = await validateReminderForUpdate(
            reminderId,
            interaction.user.id,
        );

        if (!validation.success) {
            await interaction.reply({
                content: `❌ ${validation.error}`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const modal = buildEditReminderModal(
            reminderId,
            validation.reminder.message,
        );
        await interaction.showModal(modal);
    },
};

export default editHandler;
