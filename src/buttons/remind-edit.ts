/**
 * buttons/remind-edit.ts - リマインダー編集ボタンハンドラー
 *
 * リマインダー編集用のモーダルを表示します。
 */

import type { ButtonInteraction } from "discord.js";
import { handleReminderEdit } from "../lib/remind-handlers";
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
        await handleReminderEdit(interaction, id);
    },
};
