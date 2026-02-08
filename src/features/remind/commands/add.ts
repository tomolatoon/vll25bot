import {
    ChannelType,
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandSubcommandBuilder,
    type TextChannel,
} from "discord.js";
import type { Command } from "../../../core/types";
import { parseFutureDateTime } from "../../../lib/parser/date-parser";
import { reminderService } from "../reminder-service";
import { buildReminderButtons, buildReminderEmbed } from "../utils/ui";

const data = new SlashCommandSubcommandBuilder()
    .setName("add")
    .setDescription("リマインダーを追加します")
    .addStringOption((option) =>
        option
            .setName("message")
            .setDescription("送信するメッセージ")
            .setRequired(true),
    )
    .addStringOption((option) =>
        option
            .setName("datetime")
            .setDescription(
                "送信日時 (例: 2026/01/15 9:00, 明日 9:00, 1分後 など)",
            )
            .setRequired(true),
    )
    .addChannelOption((option) =>
        option
            .setName("channel")
            .setDescription("送信先チャンネル（省略で現在のチャンネル）")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false),
    );

async function execute(interaction: ChatInputCommandInteraction) {
    const message = interaction.options.getString("message", true);
    const datetimeStr = interaction.options.getString("datetime", true);
    const targetChannel =
        (interaction.options.getChannel("channel") as TextChannel | null) ||
        (interaction.channel as TextChannel);

    const remindAt = parseFutureDateTime(datetimeStr);
    if (!remindAt) {
        await interaction.reply({
            content:
                "❌ 日時の形式を正しく入力してください。\n例: 2026/01/15 9:00, 明日 9:00, 1分後 など",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (remindAt <= new Date()) {
        await interaction.reply({
            content: "❌ 未来の日時を指定してください。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!interaction.guildId) {
        await interaction.reply({
            content: "❌ このコマンドはサーバー内でのみ使用できます。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferReply();

    const reminder = await reminderService.create(
        targetChannel.id,
        message,
        remindAt,
        interaction.user.id,
        interaction.guildId,
    );

    if (!reminder) {
        await interaction.editReply({
            content: "❌ リマインダーの登録に失敗しました。",
        });
        return;
    }

    const row = buildReminderButtons(reminder.id);

    await interaction.editReply({
        embeds: [buildReminderEmbed(reminder)],
        components: [row],
    });

    const replyMessage = await interaction.fetchReply();

    await reminderService.update(reminder.id, {
        replyMessageId: replyMessage.id,
        replyChannelId: replyMessage.channelId,
    });
}

export default { data, execute };
