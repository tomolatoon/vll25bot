import { join } from "node:path";
import {
    type ChatInputCommandInteraction,
    Client,
    GatewayIntentBits,
    type InteractionReplyOptions,
    MessageFlags,
} from "discord.js";
import { Loader } from "./core/loader";
import { Registry } from "./core/registry";
import { reminderService } from "./features/remind/reminder-service";
import { migrationService } from "./features/remind/services/migration";
import { logger } from "./utils/logger";

// Discord クライアントを作成
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
    ],
});

// レジストリとローダーの初期化
const registry = new Registry();
const loader = new Loader(registry);

// Bot起動時
client.once("clientReady", async () => {
    logger.info(`✅ ${client.user?.tag} がオンラインになりました！`);

    // 機能（Features）の読み込み
    const featuresPath = join(__dirname, "features");
    await loader.loadFeatures(featuresPath);

    logger.info(`🤖 ${client.guilds.cache.size} サーバーに接続中`);

    // リマインダーサービスの初期化
    reminderService.setClient(client);
    await migrationService.restoreFromJson();
});

// スラッシュコマンド実行時
client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isButton()) {
            const result = registry.resolveButtonHandler(interaction.customId);
            if (result) {
                await result.handler.execute(interaction, result.args);
            }
            return;
        }

        if (interaction.isAnySelectMenu()) {
            const result = registry.resolveSelectMenuHandler(
                interaction.customId,
            );
            if (result) {
                await result.handler.execute(interaction, result.args);
            }
            return;
        }

        if (interaction.isModalSubmit()) {
            const result = registry.resolveModalHandler(interaction.customId);
            if (result) {
                await result.handler.execute(interaction, result.args);
            }
            return;
        }

        if (interaction.isChatInputCommand()) {
            const command = registry.commands.get(interaction.commandName);
            if (!command) {
                logger.error(
                    `コマンド ${interaction.commandName} が見つかりません`,
                );
                return;
            }
            await command.execute(interaction);
        }
    } catch (error) {
        logger.error("❌ インタラクション実行エラー:", error);
        if (
            interaction.isRepliable() &&
            !interaction.replied &&
            !interaction.deferred
        ) {
            const reply: InteractionReplyOptions = {
                content: "エラーが発生しました。",
                flags: MessageFlags.Ephemeral,
            };
            await interaction.reply(reply);
        }
    }
});

// Graceful shutdown
let isShuttingDown = false;
const shutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info("🛑 Botをシャットダウン中...");

    // サービスのクリーンアップなどあればここで行う
    // reminderService は現状メモリ上のタスクをクリアするか？
    // DBベースなので基本的には永続化されているが、実行中タスクのキャンセルなどは必要かも？

    client.destroy().then(() => {
        logger.info("👋 オフラインになりました");
        process.exit(0);
    });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

client.login(process.env.DISCORD_TOKEN);
