import { Client, type ClientOptions, GatewayIntentBits } from "discord.js";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { Loader } from "./loader";
import { Registry } from "./registry";

export class CustomClient extends Client {
    public readonly registry: Registry;
    public readonly loader: Loader;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.MessageContent,
            ],
        });

        this.registry = new Registry();
        this.loader = new Loader(this.registry);
    }

    public async init() {
        // Load features
        const featuresPath = `${process.cwd()}/src/features`;
        await this.loader.loadFeatures(featuresPath);

        // Register event listeners (Interaction Create, etc.)
        this.registerEvents();

        // Login
        await this.login(env.DISCORD_TOKEN);
    }

    private registerEvents() {
        this.on("ready", () => {
            logger.info(`✅ ${this.user?.tag} がオンラインになりました！`);
        });

        this.on("interactionCreate", async (interaction) => {
            if (interaction.isChatInputCommand()) {
                const command = this.registry.commands.get(
                    interaction.commandName,
                );

                if (!command) {
                    logger.warn(
                        `⚠️ コマンドハンドラーが見つかりません: ${interaction.commandName}`,
                    );
                    return;
                }

                try {
                    await command.execute(interaction);
                } catch (error) {
                    logger.error("❌ コマンド実行エラー:", error);
                    try {
                        if (interaction.replied || interaction.deferred) {
                            await interaction.followUp({
                                content: "エラーが発生しました。",
                                ephemeral: true,
                            });
                        } else {
                            await interaction.reply({
                                content: "エラーが発生しました。",
                                ephemeral: true,
                            });
                        }
                    } catch (replyError) {
                        logger.error(
                            "❌ エラーメッセージの送信に失敗しました:",
                            replyError,
                        );
                    }
                }
            } else if (interaction.isButton()) {
                const result = this.registry.resolveButtonHandler(
                    interaction.customId,
                );
                if (result) {
                    try {
                        await result.handler.execute(interaction, result.args);
                    } catch (error) {
                        logger.error("❌ ボタンハンドラーエラー:", error);
                    }
                } else {
                    logger.warn(
                        `⚠️ ボタンハンドラーが見つかりません: ${interaction.customId}`,
                    );
                }
            } else if (interaction.isModalSubmit()) {
                const result = this.registry.resolveModalHandler(
                    interaction.customId,
                );
                if (result) {
                    try {
                        await result.handler.execute(interaction, result.args);
                    } catch (error) {
                        logger.error("❌ モーダルハンドラーエラー:", error);
                    }
                } else {
                    logger.warn(
                        `⚠️ モーダルハンドラーが見つかりません: ${interaction.customId}`,
                    );
                }
            } else if (interaction.isAnySelectMenu()) {
                const result = this.registry.resolveSelectMenuHandler(
                    interaction.customId,
                );
                if (result) {
                    try {
                        await result.handler.execute(interaction, result.args);
                    } catch (error) {
                        logger.error(
                            "❌ セレクトメニューハンドラーエラー:",
                            error,
                        );
                    }
                } else {
                    logger.warn(
                        `⚠️ セレクトメニューハンドラーが見つかりません: ${interaction.customId}`,
                    );
                }
            } else {
                logger.warn(
                    `⚠️ 不明なインタラクション: ${interaction.commandName}`,
                );
            }
        });
    }
}
