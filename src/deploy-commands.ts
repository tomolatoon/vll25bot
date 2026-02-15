/**
 * deploy-commands.ts - スラッシュコマンド登録スクリプト
 *
 * 実行:
 *   bun run deploy --global  グローバルコマンドを登録
 *   bun run deploy --guild   ギルドコマンドを登録
 *   bun run deploy --global --guild  両方を登録
 */

import { join } from "node:path";
import { Loader } from "@core/loader";
import { Registry } from "@core/registry";
import { logger } from "@utils/logger";
import { REST, Routes } from "discord.js";

// 環境変数（Bunは.envを自動で読み込む）
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = Bun.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error("❌ DISCORD_TOKEN または CLIENT_ID が設定されていません");
    process.exit(1);
}

const deployGlobal = process.argv.includes("--global");
const deployGuild = process.argv.includes("--guild");

const help = () => `📖 使い方:
    bun run deploy --global          グローバルコマンドに登録
    bun run deploy --guild           ギルドコマンドに登録
    bun run deploy --global --guild  両方に登録
💡 環境変数:
    DISCORD_TOKEN: ${DISCORD_TOKEN ? "設定済み" : "未設定"}
    CLIENT_ID:     ${CLIENT_ID || "未設定"}
    GUILD_ID:      ${GUILD_ID || "未設定"}
`;

// Loaderを使用してコマンドを収集
const registry = new Registry();
const loader = new Loader(registry);

const loadCommands = async () => {
    const featuresPath = join(__dirname, "features");
    await loader.loadFeatures(featuresPath);
    return registry.commands.map((cmd) => cmd.data.toJSON());
};

const rest = new REST().setToken(DISCORD_TOKEN);

const deployToGlobal = async (commands: unknown[]) => {
    logger.info(`🔄 ${commands.length}個のコマンドをグローバルに登録中...`);
    const data = (await rest.put(Routes.applicationCommands(CLIENT_ID), {
        body: commands,
    })) as unknown[];
    logger.info(`✅ ${data.length}個のグローバルコマンドを登録しました！`);
    logger.info("⏳ 反映に最大1時間かかります");
};

const deployToGuild = async (guild_id: string, commands: unknown[]) => {
    logger.info(
        `🔄 ${commands.length}個のコマンドをギルド（${guild_id}）に登録中...`,
    );
    const data = (await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, guild_id),
        {
            body: commands,
        },
    )) as unknown[];
    logger.info(`✅ ${data.length}個のギルドコマンドを登録しました！`);
    logger.info("⚡ 即座に反映されます");
};

// オプションが無い場合はヘルプを表示
if (!deployGlobal && !deployGuild) {
    logger.info(help());
    process.exit(0);
}

const main = async () => {
    try {
        const commands = await loadCommands();

        if (deployGlobal) {
            await deployToGlobal(commands);
        }

        if (deployGuild) {
            if (!GUILD_ID) {
                logger.error("❌ GUILD_ID が設定されていません");
                process.exit(1);
            }
            await deployToGuild(GUILD_ID, commands);
        }
    } catch (error) {
        logger.error("❌ 登録失敗:", error);
    }
};

main();
