/**
 * ping.ts - Botの応答速度を確認するコマンド
 */

import { logger } from "@utils/logger";
import {
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";

const data = new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Botの応答速度を確認します");

async function execute(interaction: ChatInputCommandInteraction) {
    try {
        await interaction.reply("🏓 Pong!");

        const sent = await interaction.fetchReply();

        const totalTime = sent.createdTimestamp - interaction.createdTimestamp; // 全体の応答時間

        await interaction.editReply(
            `🏓 Pong!
📡 合計応答時間: ${totalTime}ms
`,
        );
    } catch (error) {
        logger.error("❌ /ping 実行エラー:", error);
        const content = "❌ コマンドの実行中にエラーが発生しました。";
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content });
        } else {
            await interaction.reply({
                content,
                flags: MessageFlags.Ephemeral,
            });
        }
    }
}

export default { data, execute };
