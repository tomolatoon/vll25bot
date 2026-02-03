/**
 * buttons/remind-edit.ts - リマインダー編集ボタンハンドラー
 *
 * リマインダー編集用のモーダルを表示します。
 */

import {
    ActionRowBuilder,
    type ButtonInteraction,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { getReminderById } from "../reminder";
import type { ButtonHandler } from "../types";

/** リマインダー編集ボタンのIDプレフィックス */
export const BUTTON_ID_REMIND_EDIT = "remind_edit";

/** リマインダー編集モーダルのIDプレフィックス */
export const MODAL_ID_REMIND_EDIT = "remind_edit_modal";

/**
 * リマインダー編集ボタンハンドラー
 *
 * @事前条件 interaction.customId は `remind_edit:{リマインダーID}` の形式
 * @事後条件 成功時: モーダルが表示される
 * @事後条件 失敗時: エラーメッセージが表示される
 */
export const remindEditButton: ButtonHandler = {
    idPrefix: BUTTON_ID_REMIND_EDIT,

    async execute(interaction: ButtonInteraction, id: string): Promise<void> {
        const reminder = getReminderById(id);

        if (!reminder) {
            await interaction.reply({
                content: "❌ リマインダーが見つかりません。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 権限チェック: 自分が作成したリマインダーのみ編集可能
        if (reminder.createdBy !== interaction.user.id) {
            await interaction.reply({
                content: "❌ 自分が登録したリマインダーのみ編集できます。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // モーダルを作成
        const modal = new ModalBuilder()
            .setCustomId(`${MODAL_ID_REMIND_EDIT}:${id}`)
            .setTitle("リマインダー編集");

        // メッセージ入力欄（初期値は現在のメッセージ）
        const messageInput = new TextInputBuilder()
            .setCustomId("message")
            .setLabel("メッセージ（空欄で変更なし）")
            .setStyle(TextInputStyle.Paragraph)
            .setValue(reminder.message)
            .setRequired(false);

        // 日時入力欄（プレースホルダーで現在値を表示）
        const remindAt = new Date(reminder.remindAt);
        const datetimeInput = new TextInputBuilder()
            .setCustomId("datetime")
            .setLabel("日時（空欄で変更なし）")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(
                `現在: ${remindAt.toLocaleString("ja-JP")} (例: 明日 10:00)`,
            )
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                messageInput,
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                datetimeInput,
            ),
        );

        await interaction.showModal(modal);
    },
};
