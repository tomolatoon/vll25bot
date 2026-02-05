/**
 * modals/index.ts - モーダルハンドラー管理
 *
 * 新しいモーダルを追加する手順:
 * 1. modals/ に新しいファイルを作成（ModalHandler インターフェースを実装）
 * 2. ここでインポートして modalHandlers 配列に追加
 */

import type { Client, Collection, ModalSubmitInteraction } from "discord.js";
import type { ModalHandler } from "../types";
import { remindEditModal } from "./remind-edit";
import { remindPageJumpModal } from "./remind-page-jump";

// モーダルハンドラー一覧（新しいモーダルはここに追加）
const modalHandlers: ModalHandler[] = [remindEditModal, remindPageJumpModal];

/**
 * クライアントにモーダルハンドラーを登録
 * @param client Discord クライアント
 */
export function registerModalHandlers(client: Client): void {
    for (const handler of modalHandlers) {
        client.modalHandlers.set(handler.idPrefix, handler);
    }
}

/**
 * モーダルインタラクションをディスパッチ
 *
 * @param interaction モーダル送信インタラクション
 * @returns ハンドラーが見つかり処理された場合は true
 *
 * @事前条件 interaction.customId は `{idPrefix}:{引数}` の形式
 * @事後条件 該当するハンドラーが存在する場合、execute が呼び出される
 */
export async function dispatchModalInteraction(
    interaction: ModalSubmitInteraction,
): Promise<boolean> {
    const [action, id] = interaction.customId.split(":");
    const handler = interaction.client.modalHandlers.get(action);

    if (handler && id) {
        await handler.execute(interaction, id);
        return true;
    }

    return false;
}
