import type { ButtonHandler } from "@core/types";
import { type ButtonInteraction, MessageFlags } from "discord.js";
import { buildCancelledButtons } from "../components/actions";
import { buildCancelEmbed } from "../components/embeds";
import { BUTTON_ID_REMIND_CANCEL } from "../constants";
import { reminderService } from "../services/reminder-service";
import { validateReminderForUpdate } from "../utils/validation";

export const cancelHandler: ButtonHandler = {
    idPrefix: BUTTON_ID_REMIND_CANCEL,
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        const [, reminderId] = interaction.customId.split(":");
        if (!reminderId) return;

        // 検証
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

        const reminder = validation.reminder;

        // 削除実行（内部で元のReplyメッセージも「キャンセル済み」に更新される）
        await reminderService.delete(reminderId);

        // インタラクション元のメッセージを更新
        await interaction.update({
            content: "",
            embeds: [buildCancelEmbed(reminder)],
            components: [buildCancelledButtons(reminder.id)],
        });
    },
};

export default cancelHandler;
