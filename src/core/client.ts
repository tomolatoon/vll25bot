import { join } from "node:path";
import { env } from "@config/env";
import { Loader } from "@core/loader";
import { Registry } from "@core/registry";
import { logger } from "@utils/logger";
import {
    Client,
    GatewayIntentBits,
    type InteractionReplyOptions,
    MessageFlags,
    Partials,
} from "discord.js";

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
            partials: [Partials.Message, Partials.Reaction, Partials.Channel],
        });

        this.registry = new Registry();
        this.loader = new Loader(this.registry);
    }

    public async init() {
        const featuresPath = join(process.cwd(), "src", "features");

        try {
            await this.loader.loadFeatures(featuresPath);
            logger.info("📦 機能の読み込みが完了しました");
        } catch (error) {
            logger.error("❌ 機能の読み込みに失敗しました:", error);
            throw error;
        }

        this.registerEvents();

        await this.login(env.DISCORD_TOKEN);
    }

    private registerEvents() {
        this.on("clientReady", async () => {
            logger.info(`✅ ${this.user?.tag} がオンラインになりました！`);
            logger.info(`🤖 ${this.guilds.cache.size} サーバーに接続中`);

            // 各フィーチャーの setup を実行
            await this.registry.runSetups(this);
        });

        this.on("interactionCreate", async (interaction) => {
            try {
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

                    await command.execute(interaction);
                } else if (interaction.isButton()) {
                    const result = this.registry.resolveButtonHandler(
                        interaction.customId,
                    );
                    if (result) {
                        await result.handler.execute(interaction, result.args);
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
                        await result.handler.execute(interaction, result.args);
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
                        await result.handler.execute(interaction, result.args);
                    } else {
                        logger.warn(
                            `⚠️ セレクトメニューハンドラーが見つかりません: ${interaction.customId}`,
                        );
                    }
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
                    try {
                        await interaction.reply(reply);
                    } catch (replyError) {
                        logger.error(
                            "❌ エラーメッセージの送信にも失敗しました:",
                            replyError,
                        );
                    }
                }
            }
        });
    }
}
