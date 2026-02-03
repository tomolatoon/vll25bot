/**
 * modals/remind-edit.ts - リマインダー編集モーダルハンドラー
 *
 * リマインダー編集モーダルの送信処理を担当します。
 */

import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import { buildReminderButtons, buildReminderMessage } from "../commands/remind";
import { parseFutureDateTime } from "../lib/parser/date-parser";
import { getReminderById, updateReminder } from "../reminder";
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
        const reminder = getReminderById(id);

        if (!reminder) {
            await interaction.reply({
                content: "❌ リマインダーが見つかりません。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 権限チェック
        if (reminder.createdBy !== interaction.user.id) {
            await interaction.reply({
                content: "❌ 自分が登録したリマインダーのみ編集できます。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 入力値を取得（空欄は undefined）
        const newMessage =
            interaction.fields.getTextInputValue("message").trim() || undefined;
        const datetimeStr =
            interaction.fields.getTextInputValue("datetime").trim() ||
            undefined;

        // 日時のパース
        let newRemindAt: Date | undefined;
        if (datetimeStr) {
            newRemindAt = parseFutureDateTime(datetimeStr) || undefined;
            if (!newRemindAt) {
                await interaction.reply({
                    content:
                        "❌ 日時の形式を正しく入力してください。\n例: 2026/01/15 9:00, 明日 9:00, 1分後 など",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            // 過去の日時チェック
            if (newRemindAt <= new Date()) {
                await interaction.reply({
                    content: "❌ 未来の日時を指定してください。",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
        }

        // 更新項目がない場合
        if (!newMessage && !newRemindAt) {
            await interaction.reply({
                content: "❌ 変更する項目を入力してください。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // リマインダーを更新
        const updated = updateReminder(id, {
            message: newMessage,
            remindAt: newRemindAt,
        });

        if (!updated) {
            await interaction.reply({
                content: "❌ リマインダーの更新に失敗しました。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 変更内容を表示
        const changes: string[] = [];
        if (newMessage) changes.push(`📝 メッセージ: ${newMessage}`);
        if (newRemindAt)
            changes.push(
                `📅 日時: ${newRemindAt.toLocaleString("ja-JP")}`,
            );

        // 元のリプライメッセージを更新
        if (interaction.message) {
            try {
                await interaction.message.edit({
                    content: buildReminderMessage(updated),
                    components: [buildReminderButtons(updated.id)],
                });

                // メッセージリンクを生成
                const messageLink = `https://discord.com/channels/${updated.guildId}/${interaction.message.channelId}/${interaction.message.id}`;

                // Ephemeral でメッセージリンク付きで返信
                await interaction.reply({
                    content: `✅ リマインダーを更新しました！\n\n${changes.join("\n")}\n\n🔗 [リマインダーを表示](${messageLink})`,
                    flags: MessageFlags.Ephemeral,
                });
            } catch (error) {
                // メッセージが削除されている等のエラーは無視
                console.error("Failed to update original message:", error);
                
                // エラー時は通常のリプライ
                await interaction.reply({
                    content: `✅ リマインダーを更新しました！\n\n${changes.join("\n")}\n\n🆔 ID: \`${id}\``,
                    flags: MessageFlags.Ephemeral,
                });
            }
        } else {
            // メッセージが見つからない場合
            await interaction.reply({
                content: `✅ リマインダーを更新しました！\n\n${changes.join("\n")}\n\n🆔 ID: \`${id}\``,
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
