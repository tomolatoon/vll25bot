/**
 * buttons/remind-reload.ts - リマインダー更新ボタンハンドラー
 *
 * リマインダーの最新状態を取得して表示を更新します。
 */

import type { ButtonInteraction } from "discord.js";
import { handleReminderReload } from "../lib/remind-handlers";
import type { ButtonHandler } from "../types";

/** リマインダー更新ボタンのIDプレフィックス */
export const BUTTON_ID_REMIND_RELOAD = "remind_reload";

/**
 * リマインダー更新ボタンハンドラー
 *
 * @事前条件 interaction.customId は `remind_reload:{リマインダーID}` の形式
 * @事後条件 成功時: メッセージが最新状態に更新される
 * @事後条件 失敗時: 削除済みメッセージが表示される
 */
export const remindReloadButton: ButtonHandler = {
    idPrefix: BUTTON_ID_REMIND_RELOAD,

    async execute(interaction: ButtonInteraction, id: string): Promise<void> {
        await handleReminderReload(interaction, id);
    },
};
