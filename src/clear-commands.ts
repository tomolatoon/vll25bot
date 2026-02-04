/**
 * clear-commands.ts - 登録済みコマンドを削除するスクリプト
 *
 * 実行:
 *   bun run clear --global  グローバルコマンドを削除
 *   bun run clear --guild   ギルドコマンドを削除
 *   bun run clear --global --guild  両方を削除
 */

import { REST, Routes } from "discord.js";

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = Bun.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error("❌ DISCORD_TOKEN または CLIENT_ID が設定されていません");
    process.exit(1);
}

const rest = new REST().setToken(DISCORD_TOKEN);
const clearGlobal = process.argv.includes("--global");
const clearGuild = process.argv.includes("--guild");

const help = () => `📖 使い方:
    bun run clear --global          グローバルコマンドを削除
    bun run clear --guild           ギルドコマンドを削除
    bun run clear --global --guild  両方を削除
💡 環境変数:
    DISCORD_TOKEN: ${DISCORD_TOKEN ? "設定済み" : "未設定"}
    CLIENT_ID:     ${CLIENT_ID || "未設定"}
    GUILD_ID:      ${GUILD_ID || "未設定"}
`;

const deleteGuildCommands = async (guild_id: string) => {
    console.log(`🗑️ ギルド（${guild_id}）のコマンドを削除中...`);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guild_id), {
        body: [],
    });
    console.log("✅ ギルドコマンドを削除しました");
};

const deleteGlobalCommands = async () => {
    console.log("🗑️ グローバルコマンドを削除中...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
    console.log("✅ グローバルコマンドを削除しました");
    console.log("⏳ 反映には最大1時間かかる場合があります");
};

// オプションが無い場合はヘルプを表示
if (!clearGlobal && !clearGuild) {
    console.log(help());
    process.exit(0);
}

try {
    if (clearGlobal) {
        await deleteGlobalCommands();
    }

    if (clearGuild) {
        if (!GUILD_ID) {
            console.error("❌ GUILD_ID が設定されていません");
            process.exit(1);
        }
        await deleteGuildCommands(GUILD_ID);
    }

    console.log("\n💡 コマンドを再登録するには: bun run deploy");
} catch (error) {
    console.error("❌ 削除に失敗しました:\n", error);
}
