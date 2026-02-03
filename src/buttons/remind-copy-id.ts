/**
 * buttons/remind-copy-id.ts - リマインダーIDコピーボタンハンドラー
 *
 * リマインダーIDをコードブロックで送信します（Ephemeral）。
 * デスクトップ版Discordではコピーボタンが表示されます。
 */

import { type ButtonInteraction, MessageFlags } from "discord.js";
import type { ButtonHandler } from "../types";

/** リマインダーIDコピーボタンのIDプレフィックス */
export const BUTTON_ID_REMIND_COPY_ID = "remind_copy_id";

/**
 * リマインダーIDコピーボタンハンドラー
 *
 * @事前条件 interaction.customId は `remind_copy_id:{リマインダーID}` の形式
 * @事後条件 リマインダーIDがコードブロックで Ephemeral メッセージ送信される
 */
export const remindCopyIdButton: ButtonHandler = {
    idPrefix: BUTTON_ID_REMIND_COPY_ID,

    async execute(interaction: ButtonInteraction, id: string): Promise<void> {
        await interaction.reply({
            content: `${id}`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
