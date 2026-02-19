import type { ModalHandler } from "@core/types";
import { ConcurrencyError } from "@db/errors";
import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import { buildUpdateResponseEmbed } from "../components/embeds";
import { MODAL_ID_REMIND_EDIT } from "../constants";
import { reminderService } from "../services/reminder-service";
import {
    buildChangesArray,
    validateDateTimeInput,
    validateReminderForUpdate,
} from "../utils/validation";

const editModalHandler: ModalHandler = {
    idPrefix: MODAL_ID_REMIND_EDIT,
    type: "MODAL",
    async execute(interaction: ModalSubmitInteraction) {
        const [, reminderId] = interaction.customId.split(":");
        if (!reminderId) return;

        const newMessage = interaction.fields.getTextInputValue("message");
        const datetimeStr = interaction.fields.getTextInputValue("datetime");

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // 所有権確認（元のデータ取得も兼ねる）
        const ownerValidation = await validateReminderForUpdate(
            reminderId,
            interaction.user.id,
        );
        if (!ownerValidation.success) {
            await interaction.editReply({
                content: `❌ ${ownerValidation.error}`,
            });
            return;
        }
        const original = ownerValidation.reminder;

        // 日時検証
        const dateValidation = validateDateTimeInput(datetimeStr || undefined);
        if (!dateValidation.success) {
            await interaction.editReply({
                content: `❌ ${dateValidation.error}`,
            });
            return;
        }

        try {
            // 更新
            const updated = await reminderService.update(reminderId, {
                message: newMessage,
                remindAt: dateValidation.date?.getTime(),
            });

            if (!updated) {
                await interaction.editReply({
                    content:
                        "❌ リマインダーの更新に失敗しました（見つからないか、権限がありません）。",
                });
                return;
            }

            // 変更内容のリスト作成
            const changes = buildChangesArray({
                message:
                    original.message !== newMessage ? newMessage : undefined,
                remindAt:
                    original.remindAt !==
                    (dateValidation.date?.getTime() ?? original.remindAt)
                        ? dateValidation.date
                        : undefined,
            });

            // 元のメッセージを更新（ID表示など）
            await reminderService.updateOriginalMessageAsEdited(updated);

            const responseEmbed = buildUpdateResponseEmbed(updated, changes);

            await interaction.editReply({
                embeds: [responseEmbed],
            });
        } catch (error) {
            // 楽観的ロック競合エラー
            if (error instanceof ConcurrencyError) {
                await interaction.editReply({
                    content:
                        "⚠️ このリマインダーは他のユーザーによって更新されました。\n最新のデータを確認してから再度編集してください。",
                });
                return;
            }
            // その他のエラー
            await interaction.editReply({
                content: "❌ 予期しないエラーが発生しました。",
            });
        }
    },
};

export default editModalHandler;
