import {
    type ChatInputCommandInteraction,
    Client,
    Collection,
    GatewayIntentBits,
    type InteractionReplyOptions,
    MessageFlags,
} from "discord.js";
import { dispatchButtonInteraction, registerButtonHandlers } from "./buttons";
import { registerCommands } from "./commands";
import { registerForwardCleanupHandler } from "./events/forwardCleanup";
import { dispatchModalInteraction, registerModalHandlers } from "./modals";
import {
    restoreReminders,
    saveReminders,
    setClient,
    stopReminders,
} from "./reminder";
import type { ButtonHandler, Command, ModalHandler } from "./types";
import { logger } from "./utils/logger";

// discord.js の Client 型を拡張
declare module "discord.js" {
    interface Client {
        commands: Collection<string, Command>;
        buttonHandlers: Collection<string, ButtonHandler>;
        modalHandlers: Collection<string, ModalHandler>;
    }
}

// Discord クライアントを作成
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
    ],
});

// コマンド、ボタン、モーダルハンドラーを登録
client.commands = new Collection();
client.buttonHandlers = new Collection();
client.modalHandlers = new Collection();
registerCommands(client);
registerButtonHandlers(client);
registerModalHandlers(client);
registerForwardCleanupHandler(client);

// Bot起動時（v15対応: ready → clientReady）
client.once("clientReady", () => {
    logger.info(`✅ ${client.user?.tag} がオンラインになりました！`);
    logger.info(`🤖 ${client.guilds.cache.size} サーバーに接続中`);

    // リマインダーにクライアントを設定し、保存されたリマインダーを復元
    setClient(client);
    restoreReminders();
});

// スラッシュコマンド実行時
client.on("interactionCreate", async (interaction) => {
    // ボタンクリック処理（レジストリベースでディスパッチ）
    if (interaction.isButton()) {
        await dispatchButtonInteraction(interaction);
        return;
    }

    // モーダル送信処理（レジストリベースでディスパッチ）
    if (interaction.isModalSubmit()) {
        await dispatchModalInteraction(interaction);
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        logger.error(`コマンド ${interaction.commandName} が見つかりません`);
        return;
    }

    try {
        await command.execute(interaction as ChatInputCommandInteraction);
    } catch (error) {
        logger.error("コマンド実行エラー:", error);
        const reply: InteractionReplyOptions = {
            content: "コマンドの実行中にエラーが発生しました。",
            flags: MessageFlags.Ephemeral,
        };

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        } catch (e) {
            // Unknown interaction などで返信できない場合はログに出して無視
            logger.error("エラーメッセージの送信に失敗しました:\n", e);
        }
    }
});

// Graceful shutdown（Ctrl+C でオフライン表示を即座に反映）
let isShuttingDown = false;
const shutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info("🛑 Botをシャットダウン中...");
    // リマインダーを保存してタスクを停止
    saveReminders();
    stopReminders();
    client.destroy().then(() => {
        logger.info("👋 オフラインになりました");
        process.exit(0);
    });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ログイン（Bunは.envを自動で読み込む）
client.login(Bun.env.DISCORD_TOKEN);
