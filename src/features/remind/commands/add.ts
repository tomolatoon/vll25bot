import {
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";
import { parseFutureDateTime } from "../../../lib/parser/date-parser";
import type { Command } from "../../../core/types";
import { reminderService } from "../reminder-service";
import { buildAddResponseEmbed } from "../components/embeds";

export const reminderAdd: Command = {
    data: new SlashCommandBuilder()
        .setName("add")
        .setDescription("新しいリマインダーを登録します")
        .addStringOption((option) =>
            option
                .setName("message")
                .setDescription("通知するメッセージ")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("datetime")
                .setDescription("日時 (例: 2026/01/15 9:00, 明日 9:00, 1分後)")
                .setRequired(true),
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId || !interaction.channel) return;

        const message = interaction.options.getString("message", true);
        const datetimeStr = interaction.options.getString("datetime", true);

        // 日時パース
        const date = parseFutureDateTime(datetimeStr);
        if (!date) {
            await interaction.reply({
                content:
                    "❌ 日時の形式が正しくありません。\n例: 2026/01/15 9:00, 明日 9:00, 1分後 など",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (date <= new Date()) {
            await interaction.reply({
                content: "❌ 未来の日時を指定してください。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // リマインダー作成
        const reminder = await reminderService.create(
            interaction.channelId,
            message,
            date,
            interaction.user.id,
            interaction.guildId,
        );

        if (reminder) {
            // リプライ（自分だけに見える）
            await interaction.reply({
                embeds: [
                    buildAddResponseEmbed(
                        reminder,
                        interaction.channel as TextChannel,
                    ),
                ],
                // components: [buildReminderButtons(reminder.id)], // ボタンはリスト表示だけで良いかも？またはキャンセルボタンだけつける？
                // デザイン変更案：登録完了時はシンプルに。詳細はEmbedに。
                flags: MessageFlags.Ephemeral,
            });

            // 元のチャンネルへの送信は、リマインダー発火時に行われるのでここでは通知のみ
        } else {
            await interaction.reply({
                content: "❌ リマインダーの登録に失敗しました。",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
