/**
 * index.ts - Discord Bot のメインエントリーポイント
 *
 * Botの起動とイベントハンドリングを担当します。
 */

import {
    type ChatInputCommandInteraction,
    Client,
    Collection,
    GatewayIntentBits,
} from "discord.js";
import { registerCommands } from "./commands";
import {
    BUTTON_ID_REMIND_CANCEL,
    handleRemindCancelButton,
} from "./commands/remind";
import {
    restoreReminders,
    saveReminders,
    setClient,
    stopReminders,
} from "./reminder";
import type { Command } from "./types";

// discord.js の Client 型を拡張
declare module "discord.js" {
    interface Client {
        commands: Collection<string, Command>;
    }
}

// Discord クライアントを作成
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// コマンドを登録
client.commands = new Collection();
registerCommands(client);

// Bot起動時（v15対応: ready → clientReady）
client.once("clientReady", () => {
    console.log(`✅ ${client.user?.tag} がオンラインになりました！`);
    console.log(`🤖 ${client.guilds.cache.size} サーバーに接続中`);

    // リマインダーにクライアントを設定し、保存されたリマインダーを復元
    setClient(client);
    restoreReminders();
});

// スラッシュコマンド実行時
client.on("interactionCreate", async (interaction) => {
    // ボタンクリック処理
    if (interaction.isButton()) {
        const [action, id] = interaction.customId.split(":");

        if (action === BUTTON_ID_REMIND_CANCEL && id) {
            await handleRemindCancelButton(interaction, id);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`コマンド ${interaction.commandName} が見つかりません`);
        return;
    }

    try {
        await command.execute(interaction as ChatInputCommandInteraction);
    } catch (error) {
        console.error("コマンド実行エラー:", error);
        const reply = {
            content: "コマンドの実行中にエラーが発生しました。",
            ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

// Graceful shutdown（Ctrl+C でオフライン表示を即座に反映）
let isShuttingDown = false;
const shutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log("🛑 Botをシャットダウン中...");
    // リマインダーを保存してタスクを停止
    saveReminders();
    stopReminders();
    client.destroy().then(() => {
        console.log("👋 オフラインになりました");
        process.exit(0);
    });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ログイン（Bunは.envを自動で読み込む）
client.login(Bun.env.DISCORD_TOKEN);
