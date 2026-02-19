import type { ButtonHandler } from "@core/types";
import { type ButtonInteraction, MessageFlags } from "discord.js";
import { LIST_CANCEL_PREFIX } from "../constants";
import { reminderService } from "../services/reminder-service";
import { buildReminderListView } from "../services/renderer";
import { decodeState } from "../utils/list";
import { validateReminderForUpdate } from "../utils/validation";

export const listCancelHandler: ButtonHandler = {
    idPrefix: LIST_CANCEL_PREFIX,
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guildId) return;

        await interaction.deferUpdate();

        const { state, selectedId } = decodeState(
            interaction.customId,
            interaction.guildId,
            interaction.user.id,
        );

        if (selectedId) {
            // 検証
            const validation = await validateReminderForUpdate(
                selectedId,
                interaction.user.id,
                interaction.guildId,
            );

            if (!validation.success) {
                await interaction.followUp({
                    content: `❌ ${validation.error}`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            // 削除
            await reminderService.delete(selectedId);
        }

        // リスト再描画 (選択解除)
        const { embed, components } = await buildReminderListView(
            interaction.guildId,
            state,
        );

        await interaction.editReply({
            embeds: [embed],
            components: components,
        });
    },
};

export default listCancelHandler;
