/**
 * omikuji.ts - おみくじコマンド
 *
 * 重み付け抽選で運勢を表示。大吉・大凶は出にくい設定。
 */

import { logger } from "@utils/logger";
import {
    type ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import type { Fortune } from "../types";

// 運勢データ（結果, 絵文字, 色）
const fortunes: Fortune[] = [
    { result: "大吉", emoji: "🎊", color: 0xffd700 },
    { result: "中吉", emoji: "🎉", color: 0xff8c00 },
    { result: "小吉", emoji: "🌸", color: 0xffc0cb },
    { result: "吉", emoji: "✨", color: 0x90ee90 },
    { result: "末吉", emoji: "🍀", color: 0x87ceeb },
    { result: "凶", emoji: "💧", color: 0x808080 },
    { result: "大凶", emoji: "🌧️", color: 0x4a4a4a },
] as const;

// 出現確率（%）: 大吉, 中吉, 小吉, 吉, 末吉, 凶, 大凶
const weights = [5, 15, 20, 25, 20, 14, 1] as const;

/** 重み付け抽選で運勢を決定 */
function drawFortune(): Fortune {
    const rand = Math.random() * 100;
    let sum = 0;
    for (const i of [...weights.keys()]) {
        sum += weights[i];
        if (rand < sum) return fortunes[i];
    }
    return fortunes[3]; // フォールバック: 吉
}

const data = new SlashCommandBuilder()
    .setName("omikuji")
    .setDescription("おみくじを引きます");

async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const fortune = drawFortune();
        const today = new Date().toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        const embed = new EmbedBuilder()
            .setTitle(`${fortune.emoji} おみくじ ${fortune.emoji}`)
            .setDescription(`# ${fortune.result}`)
            .setColor(fortune.color)
            .setFooter({
                text: `${today}`,
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error("❌ /omikuji 実行エラー:", error);
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
