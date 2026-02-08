import { type ButtonInteraction, MessageFlags } from "discord.js";
import type { ButtonHandler } from "../../../core/types";
import { reminderService } from "../reminder-service";
import { decodeState } from "../utils/list";
import { LIST_SHOW_PREFIX } from "../constants";
import { buildReminderButtons } from "../components/actions";
import { buildReminderDetailEmbed } from "../components/embeds";

export const listShowHandler: ButtonHandler = {
    idPrefix: LIST_SHOW_PREFIX,
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guildId) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const { selectedId } = decodeState(
            interaction.customId,
            interaction.guildId,
            interaction.user.id,
        );

        if (selectedId) {
            const reminder = await reminderService.getReminderById(selectedId);
            if (reminder) {
                await interaction.editReply({
                    embeds: [buildReminderDetailEmbed(reminder)],
                    components: [buildReminderButtons(reminder.id)],
                });
            } else {
                await interaction.editReply({
                    content: "❌ リマインダーが見つかりません。",
                });
            }
        }
    },
};

export default listShowHandler;
