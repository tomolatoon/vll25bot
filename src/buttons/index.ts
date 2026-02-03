/**
 * buttons/index.ts - ボタンハンドラー管理
 *
 * 新しいボタンを追加する手順:
 * 1. buttons/ に新しいファイルを作成（ButtonHandler インターフェースを実装）
 * 2. ここでインポートして buttonHandlers 配列に追加
 */

import type { ButtonInteraction, Client, Collection } from "discord.js";
import type { ButtonHandler } from "../types";
import { remindCancelButton } from "./remind-cancel";
import { remindCopyIdButton } from "./remind-copy-id";
import { remindEditButton } from "./remind-edit";
import { remindReloadButton } from "./remind-reload";

// ボタンハンドラー一覧（新しいボタンはここに追加）
const buttonHandlers: ButtonHandler[] = [
    remindCancelButton,
    remindEditButton,
    remindCopyIdButton,
    remindReloadButton,
];

/**
 * クライアントにボタンハンドラーを登録
 * @param client Discord クライアント
 */
export function registerButtonHandlers(client: Client): void {
    for (const handler of buttonHandlers) {
        client.buttonHandlers.set(handler.idPrefix, handler);
    }
}

/**
 * ボタンインタラクションをディスパッチ
 *
 * @param interaction ボタンインタラクション
 * @returns ハンドラーが見つかり処理された場合は true
 *
 * @事前条件 interaction.customId は `{idPrefix}:{引数}` の形式
 * @事後条件 該当するハンドラーが存在する場合、execute が呼び出される
 */
export async function dispatchButtonInteraction(
    interaction: ButtonInteraction,
): Promise<boolean> {
    const [action, id] = interaction.customId.split(":");
    const handler = interaction.client.buttonHandlers.get(action);

    if (handler && id) {
        await handler.execute(interaction, id);
        return true;
    }

    return false;
}
