/**
 * misc フィーチャーのセットアップ
 *
 * clientReady 時に Loader/Registry 経由で自動的に呼び出される。
 *
 * @precondition client が ready 状態であること
 * @postcondition forwardCleanup のイベントハンドラーが登録される
 */
import type { Client } from "discord.js";
import { registerForwardCleanupHandler } from "./handlers/forward-cleanup";

export default async function setup(client: Client): Promise<void> {
    registerForwardCleanupHandler(client);
}
