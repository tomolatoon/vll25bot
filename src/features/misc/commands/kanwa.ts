/**
 * kanwa.ts - 閑話休題コマンド
 */

import {
    type ChatInputCommandInteraction,
    SlashCommandBuilder,
    type TextChannel,
} from "discord.js";
import type { Command } from "../types";

const data = new SlashCommandBuilder()
    .setName("kanwa")
    .setDescription("閑話休題を送信します")
    .addIntegerOption((option) =>
        option
            .setName("space")
            .setDescription("いくつ全角スペースを入れるか")
            .setRequired(false),
    )
    .addStringOption((option) =>
        option
            .setName("reason")
            .setDescription("閑話休題を入れる理由")
            .setRequired(false),
    )
    .addIntegerOption((option) =>
        option
            .setName("times")
            .setDescription("何回連投するか（最大5回）")
            .setRequired(false),
    );

async function execute(interaction: ChatInputCommandInteraction) {
    const useSpace = interaction.options.getInteger("space") ?? 0;
    const reason = interaction.options.getString("reason");
    const times = Math.min(interaction.options.getInteger("times") ?? 1, 5);

    const spaces = "　".repeat(useSpace); // 全角スペース
    const message = `# 閑${spaces}話${spaces}休${spaces}題${
        reason ? `\n-# ${reason}` : ""
    }`;

    // コマンドの応答を遅延させて削除（痕跡を消す）
    await interaction.deferReply();
    await interaction.deleteReply();

    const channel = interaction.channel as TextChannel;
    for (let i = 0; i < times; i++) {
        await channel.send(message);
    }
}

export default { data, execute };
