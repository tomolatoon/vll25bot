/**
 * fetch.ts - メッセージ内容を取得するコマンド
 */

import {
    type ChatInputCommandInteraction,
    SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../types";

export const fetch: Command = {
    data: new SlashCommandBuilder()
        .setName("fetch")
        .setDescription("メッセージを取得します")
        .addStringOption((option) =>
            option
                .setName("message_id")
                .setDescription("メッセージID")
                .setRequired(true),
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const messageId = interaction.options.getString("message_id", true);

        const message = await interaction.channel?.messages.fetch(messageId);

        if (message) {
            await interaction.reply(`${message.content}`);
        } else {
            await interaction.reply("❌️ メッセージが見つかりませんでした");
        }
    },
};
