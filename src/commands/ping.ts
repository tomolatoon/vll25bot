/**
 * ping.ts - Botの応答速度を確認するコマンド
 */

import {
    type ChatInputCommandInteraction,
    SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../types";

export const ping: Command = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Botの応答速度を確認します"),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply("🏓 Pong!");

        const sent = await interaction.fetchReply();

        const totalTime = sent.createdTimestamp - interaction.createdTimestamp; // 全体の応答時間

        await interaction.editReply(
            `🏓 Pong!\n📡 合計応答時間: ${totalTime}ms\n`,
        );
    },
};
