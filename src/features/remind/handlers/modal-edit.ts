import type { ModalHandler } from "@core/types";
import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import { buildReminderButtons } from "../components/actions";
import {
    buildReminderEmbed,
    buildUpdateResponseEmbed,
} from "../components/embeds";
import { MODAL_ID_REMIND_EDIT } from "../constants";
import { reminderService } from "../services/reminder-service";
import { buildChangesArray, validateDateTimeInput } from "../utils/validation";

const editModalHandler: ModalHandler = {
    idPrefix: MODAL_ID_REMIND_EDIT,
    type: "MODAL",
    async execute(interaction: ModalSubmitInteraction) {
        const reminderId = interaction.customId.split(":")[1];
        const newMessage = interaction.fields.getTextInputValue("message");
        const datetimeStr = interaction.fields.getTextInputValue("datetime");

        // 検証
        const dateValidation = validateDateTimeInput(datetimeStr || undefined);
        if (!dateValidation.success) {
            await interaction.reply({
                content: `❌ ${dateValidation.error}`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 変更内容を特定するために元のデータを取得
        const original = await reminderService.getReminderById(reminderId);

        // 更新
        const updated = await reminderService.update(reminderId, {
            message: newMessage,
            remindAt: dateValidation.date?.getTime(),
        });

        if (!updated || !original) {
            await interaction.reply({
                content:
                    "❌ リマインダーの更新に失敗しました（見つからないか、権限がありません）。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 変更内容のリスト作成
        const changes = buildChangesArray({
            message: original.message !== newMessage ? newMessage : undefined,
            remindAt:
                original.remindAt !==
                (dateValidation.date?.getTime() ?? original.remindAt)
                    ? dateValidation.date
                    : undefined,
        });

        // 元のメッセージを更新（ID表示など）
        await reminderService.updateOriginalMessageAsEdited(updated);

        const responseEmbed = buildUpdateResponseEmbed(updated, changes);

        await interaction.reply({
            embeds: [responseEmbed],
            flags: MessageFlags.Ephemeral,
        });
    },
};

export default editModalHandler;
