import type { ButtonHandler } from "@core/types";
import { type ButtonInteraction, MessageFlags } from "discord.js";
import { buildEditReminderModal } from "../components/modals";
import { LIST_EDIT_PREFIX } from "../constants";
import { decodeState } from "../utils/list";
import { validateReminderForUpdate } from "../utils/validation";

export const listEditHandler: ButtonHandler = {
    idPrefix: LIST_EDIT_PREFIX,
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guildId) return;

        const { selectedId } = decodeState(
            interaction.customId,
            interaction.guildId,
            interaction.user.id,
        );
        if (selectedId) {
            const validation = await validateReminderForUpdate(
                selectedId,
                interaction.user.id,
                interaction.guildId,
            );
            if (!validation.success) {
                await interaction.reply({
                    content: `❌ ${validation.error}`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            const modal = buildEditReminderModal(
                selectedId,
                validation.reminder.message,
            );
            await interaction.showModal(modal);
        }
    },
};

export default listEditHandler;
