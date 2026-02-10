/**
 * fetch.ts - メッセージ内容を取得するコマンド
 */

import {
    type ChatInputCommandInteraction,
    type PartialGroupDMChannel,
    SlashCommandBuilder,
    type TextBasedChannel,
} from "discord.js";
import type { Command } from "../types";

/**
 * メッセージURLを解析する
 * @param url - DiscordメッセージURL (https://discord.com/channels/{guild_id}/{channel_id}/{message_id})
 * @returns 解析結果 { guildId, channelId, messageId } または null
 */
function parseMessageUrl(url: string): {
    guildId: string;
    channelId: string;
    messageId: string;
} | null {
    // Discord メッセージURLの正規表現
    const regex =
        /^https?:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/channels\/(\d+|@me)\/(\d+)\/(\d+)$/;
    const match = url.match(regex);

    if (!match) {
        return null;
    }

    return {
        guildId: match[1],
        channelId: match[2],
        messageId: match[3],
    };
}

const data = new SlashCommandBuilder()
    .setName("fetch")
    .setDescription("メッセージを取得します")
    .addStringOption((option) =>
        option
            .setName("message_url")
            .setDescription("メッセージURL")
            .setRequired(true),
    );

async function execute(interaction: ChatInputCommandInteraction) {
    // 応答を遅延（3秒以内に応答する必要があるため）
    await interaction.deferReply();

    const messageUrl = interaction.options.getString("message_url", true);

    // URLを解析
    const parsed = parseMessageUrl(messageUrl);

    if (!parsed) {
        await interaction.editReply({
            content:
                "❌ 無効なメッセージURLです。\n正しい形式: `https://discord.com/channels/{server_id}/{channel_id}/{message_id}`",
        });
        return;
    }

    const { guildId, channelId, messageId } = parsed;

    try {
        // クライアントからギルドを取得
        const guild = await interaction.client.guilds.fetch(guildId);

        if (!guild) {
            await interaction.editReply({
                content: "❌ サーバーが見つかりませんでした。",
            });
            return;
        }

        // チャンネルを取得
        const channel = await guild.channels.fetch(channelId);

        if (!channel?.isTextBased()) {
            await interaction.editReply({
                content:
                    "❌ チャンネルが見つからないか、テキストチャンネルではありません。",
            });
            return;
        }

        // メッセージを取得
        const message = await channel.messages.fetch(messageId);

        if (!message) {
            await interaction.editReply({
                content: "❌ メッセージが見つかりませんでした。",
            });
            return;
        }

        // 初回応答を削除
        await interaction.deleteReply();

        // チャンネルの存在確認
        const targetChannel = interaction.channel;
        if (!targetChannel || !targetChannel.isTextBased()) {
            console.error("interaction.channel が無効です");
            return;
        }

        // PartialGroupDMChannel を除外（Guildコマンドなので発生しないが型安全のため）
        if (targetChannel.isDMBased() && targetChannel.partial) {
            console.error("PartialGroupDMChannel はサポートされていません");
            return;
        }

        // メッセージを転送（Discord 公式の転送機能と同じ見た目）
        // Guildコマンドなので PartialGroupDMChannel は発生しないが、型安全のためアサーション
        const forwarded = await message.forward(
            targetChannel as Exclude<TextBasedChannel, PartialGroupDMChannel>,
        );

        // 削除用リアクションを追加
        await forwarded.react("🗑️");
    } catch (error) {
        console.error("メッセージ取得エラー:\n", error);

        // エラー時は editReply が使えない可能性があるため、チャンネルに直接送信
        if (interaction.channel && "send" in interaction.channel) {
            await interaction.channel.send({
                content:
                    "❌ メッセージの取得に失敗しました。\nBotに適切な権限があるか確認してください。",
            });
        }
    }
}

export default { data, execute };
