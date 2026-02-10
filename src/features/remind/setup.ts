/**
 * remind フィーチャーのセットアップ
 *
 * clientReady 時に Loader/Registry 経由で自動的に呼び出される。
 *
 * @precondition client が ready 状態であること
 * @postcondition reminderService と migrationService が初期化される
 */
import type { Client } from "discord.js";
import { migrationService } from "./services/migration";
import { reminderService } from "./services/reminder-service";

export async function setup(client: Client): Promise<void> {
    reminderService.setClient(client);
    await migrationService.restoreFromJson();
}
