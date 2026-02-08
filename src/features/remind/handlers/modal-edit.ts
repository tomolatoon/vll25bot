import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import type { ModalHandler } from "../../../core/types";
import { reminderService } from "../reminder-service";
import {
    buildReminderButtons,
} from "../components/actions";
import {
    buildReminderEmbed,
    buildUpdateResponseEmbed,
} from "../components/embeds"; 
import { buildChangesArray, validateDateTimeInput } from "../utils/validation";

// NOTE: ui-exports is temporary, I should import from individual files if ui-exports doesn't work or if I want to be clean.
// Given previous error, I should import from components directly.
// actually, I will import from components/embeds etc directly.

const editModalHandler: ModalHandler = {
    idPrefix: "remind_edit_modal:",
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
            remindAt: original.remindAt !== (dateValidation.date?.getTime() ?? original.remindAt) ? dateValidation.date : undefined,
        });

        // 元のメッセージを更新（ID表示など）
        if (updated.replyMessageId && updated.replyChannelId) {
            try {
                const channel = await interaction.client.channels.fetch(
                    updated.replyChannelId,
                );
                if (channel?.isTextBased()) {
                    const message = await channel.messages.fetch(
                        updated.replyMessageId,
                    );
                    await message.edit({
                        embeds: [buildReminderEmbed(updated)],
                        components: [buildReminderButtons(updated.id)],
                    });
                }
            } catch (error) {
                // 無視（メッセージ削除済みなど）
            }
        }

        const responseEmbed = buildUpdateResponseEmbed(
            updated,
            changes,
        );

        await interaction.reply({
            embeds: [responseEmbed],
            flags: MessageFlags.Ephemeral,
        });
    },
};

export default editModalHandler;
