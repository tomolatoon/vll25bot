/**
 * modals/remind-edit.ts - リマインダー編集モーダルハンドラー
 *
 * リマインダー編集モーダルの送信処理を担当します。
 */

import {
    MessageFlags,
    type ModalSubmitInteraction,
    type TextChannel,
} from "discord.js";
import { buildReminderButtons, buildReminderMessage } from "../lib/remind-ui";
import {
    buildChangesArray,
    buildUpdateResponseContent,
    validateDateTimeInput,
    validateReminderForUpdate,
} from "../lib/remind";
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

        // 7. 過去の登録完了メッセージを更新（存在する場合）
        if (updated.replyMessageId && updated.replyChannelId) {
            try {
                const channel = (await interaction.client.channels.fetch(
                    updated.replyChannelId,
                )) as TextChannel | null;

                if (channel) {
                    const replyMessage = await channel.messages.fetch(
                        updated.replyMessageId,
                    );
                    if (replyMessage) {
                        await replyMessage.edit({
                            content: buildReminderMessage(updated),
                            components: [buildReminderButtons(updated.id)],
                        });
                    }
                }
            } catch (error) {
                // メッセージが見つからない、権限がないなどのエラーは無視
            }
        }

        // 8. 返信メッセージを生成して送信
        const responseContent = buildUpdateResponseContent(updated, changes);

        await interaction.reply({
            content: responseContent,
            flags: MessageFlags.Ephemeral,
        });
    },
};
