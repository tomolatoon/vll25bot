/**
 * commands/index.ts - コマンド管理
 *
 * 新しいコマンドを追加する手順:
 * 1. commands/ に新しいファイルを作成
 * 2. ここでインポートして配列に追加
 * 3. bun deploy で登録
 */

import type { Client } from "discord.js";
import type { Command } from "../types";
import { kanwa } from "./kanwa";
import { omikuji } from "./omikuji";
import { ping } from "./ping";
import { remind } from "./remind";

// コマンド一覧（新しいコマンドはここに追加）
const commands: Command[] = [kanwa, omikuji, ping, remind];

/** クライアントにコマンドを登録 */
export function registerCommands(client: Client): void {
    for (const cmd of commands) {
        client.commands.set(cmd.data.name, cmd);
    }
}

/** Discord API登録用のJSONデータを取得 */
export function getCommandsData() {
    return commands.map((cmd) => cmd.data.toJSON());
}
