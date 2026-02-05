/**
 * buttons/remind-cancel.ts - リマインダー解除ボタンハンドラー
 *
 * リマインダー登録時に表示される「登録解除」ボタンの処理を担当します。
 */

import { type ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { BUTTON_ID_REMIND_CANCEL } from "../commands/remind";
import { handleReminderCancel } from "../lib/remind-handlers";
import { REMIND_COLOR_INFO, REMIND_COLOR_SUCCESS } from "../lib/remind-ui";
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
        const result = await handleReminderCancel(interaction, id);

        if (!result.success) {
            if (result.reason === "not_owner") {
                await interaction.reply({
                    content: "❌ 自分が登録したリマインダーのみ解除できます。",
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                // not_found, already_done の場合
                await interaction.update({
                    content: "",
                    embeds: [
                        new EmbedBuilder()
                            .setColor(REMIND_COLOR_INFO)
                            .setDescription(
                                `❓ リマインダー \`${id}\` は既に解除済みです。`,
                            ),
                    ],
                    components: [],
                });
            }
            return;
        }

        await interaction.update({
            content: "",
            embeds: [
                new EmbedBuilder()
                    .setColor(REMIND_COLOR_SUCCESS)
                    .setTitle("🗑️ リマインダー解除")
                    .setDescription(`リマインダー \`${id}\` を解除しました。`),
            ],
            components: [],
        });
    },
};
