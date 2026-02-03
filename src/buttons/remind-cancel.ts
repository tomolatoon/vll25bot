/**
 * buttons/remind-cancel.ts - リマインダー解除ボタンハンドラー
 *
 * リマインダー登録時に表示される「登録解除」ボタンの処理を担当します。
 */

import { type ButtonInteraction, MessageFlags } from "discord.js";
import { BUTTON_ID_REMIND_CANCEL, cancelReminder } from "../commands/remind";
import type { ButtonHandler } from "../types";

/**
 * リマインダー解除ボタンハンドラー
 *
 * @事前条件 interaction.customId は `remind_cancel:{リマインダーID}` の形式
 * @事後条件 成功時: リマインダーが解除され、メッセージが更新される
 * @事後条件 失敗時: エラーメッセージが表示される
 */
export const remindCancelButton: ButtonHandler = {
    idPrefix: BUTTON_ID_REMIND_CANCEL,

    async execute(interaction: ButtonInteraction, id: string): Promise<void> {
        const result = cancelReminder(id, interaction.user.id);

        if (!result.success) {
            if (result.reason === "not_owner") {
                await interaction.reply({
                    content: "❌ 自分が登録したリマインダーのみ解除できます。",
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                // not_found, already_done の場合
                // wrong_guild は発生しない想定
                await interaction.update({
                    content: `❓ リマインダー \`${id}\` は既に解除済みです。`,
                    components: [],
                });
            }
            return;
        }

        await interaction.update({
            content: `🗑️ リマインダー \`${id}\` を解除しました。`,
            components: [],
        });
    },
};
