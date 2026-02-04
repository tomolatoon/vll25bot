/**
 * modals/remind-edit.ts - リマインダー編集モーダルハンドラー
 *
 * リマインダー編集モーダルの送信処理を担当します。
 */

import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import { buildReminderButtons, buildReminderMessage } from "../commands/remind";
import {
    buildChangesArray,
    buildUpdateResponseContent,
    validateDateTimeInput,
    validateReminderForUpdate,
} from "../lib/reminder";
import { updateReminder } from "../reminder";
import type { ModalHandler } from "../types";

/** リマインダー編集モーダルのIDプレフィックス */
export const MODAL_ID_REMIND_EDIT = "remind_edit_modal";

/**
 * リマインダー編集モーダルハンドラー
 *
 * @事前条件 interaction.customId は `remind_edit_modal:{リマインダーID}` の形式
 * @事後条件 成功時: リマインダーが更新され、確認メッセージが表示される
 * @事後条件 失敗時: エラーメッセージが表示される
 */
export const remindEditModal: ModalHandler = {
    idPrefix: MODAL_ID_REMIND_EDIT,

    async execute(
        interaction: ModalSubmitInteraction,
        id: string,
    ): Promise<void> {
        // 1. バリデーション
        const validation = validateReminderForUpdate(id, interaction.user.id);
        if (!validation.success) {
            await interaction.reply({
                content: `❌ ${validation.error}`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 2. 入力値を取得
        const newMessage =
            interaction.fields.getTextInputValue("message").trim() || undefined;
        const datetimeStr =
            interaction.fields.getTextInputValue("datetime").trim() ||
            undefined;

        // 3. 日時のバリデーション
        const dateValidation = validateDateTimeInput(datetimeStr);
        if (!dateValidation.success) {
            await interaction.reply({
                content: `❌ ${dateValidation.error}`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 4. 更新項目の確認
        if (!newMessage && !dateValidation.date) {
            await interaction.reply({
                content: "❌ 変更する項目を入力してください。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 5. リマインダーを更新
        const updated = updateReminder(id, {
            message: newMessage,
            remindAt: dateValidation.date,
        });

        if (!updated) {
            await interaction.reply({
                content: "❌ リマインダーの更新に失敗しました。\n",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 6. 変更内容を生成
        const changes = buildChangesArray({
            message: newMessage,
            remindAt: dateValidation.date,
        });

        // 7. 元メッセージを更新（存在する場合）
        if (interaction.message) {
            try {
                await interaction.message.edit({
                    content: buildReminderMessage(updated),
                    components: [buildReminderButtons(updated.id)],
                });
            } catch (error) {
                // メッセージが削除されている等のエラーは無視
            }
        }

        // 8. 返信メッセージを生成して送信
        const responseContent = buildUpdateResponseContent(
            updated,
            changes,
            interaction.message
                ? {
                      guildId: updated.guildId,
                      channelId: interaction.message.channelId,
                      messageId: interaction.message.id,
                  }
                : undefined,
        );

        await interaction.reply({
            content: responseContent,
            flags: MessageFlags.Ephemeral,
        });
    },
};
