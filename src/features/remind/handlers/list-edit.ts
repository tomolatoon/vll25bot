import { type ButtonInteraction, MessageFlags } from "discord.js";
import type { ButtonHandler } from "../../../core/types";
import { buildEditReminderModal } from "../components/modals";
import { LIST_EDIT_PREFIX } from "../constants";
import { reminderService } from "../reminder-service";
import { decodeState } from "../utils/list";

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
            // 編集ロジック（モーダル表示）
            const reminder = await reminderService.getReminderById(selectedId);
            if (reminder) {
                if (reminder.createdBy !== interaction.user.id) {
                    await interaction.reply({
                        content:
                            "❌ 自分が登録したリマインダーのみ編集できます。",
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }
                // モーダル作成
                const modal = buildEditReminderModal(
                    selectedId,
                    reminder.message,
                );
                await interaction.showModal(modal);
            } else {
                await interaction.reply({
                    content: "❌ リマインダーが見つかりません。",
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    },
};

export default listEditHandler;
