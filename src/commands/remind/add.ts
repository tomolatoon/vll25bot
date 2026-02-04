import {
    ChannelType,
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandSubcommandBuilder,
    type TextChannel,
} from "discord.js";
import { parseFutureDateTime } from "../../lib/parser/date-parser";
import {
    buildReminderButtons,
    buildReminderMessage,
} from "../../lib/remind-ui";
import { createReminder, updateReminder } from "../../reminder";

export const addCommand = new SlashCommandSubcommandBuilder()
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

/** リマインダー追加 */
export async function handleAdd(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    const message = interaction.options.getString("message", true);
    const datetimeStr = interaction.options.getString("datetime", true);
    const targetChannel =
        (interaction.options.getChannel("channel") as TextChannel | null) ||
        (interaction.channel as TextChannel);

    // 日時をパース
    const remindAt = parseFutureDateTime(datetimeStr);
    if (!remindAt) {
        await interaction.reply({
            content:
                "❌ 日時の形式を正しく入力してください。\n例: 2026/01/15 9:00, 明日 9:00, 1分後 など",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // 過去の日時チェック
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

    // リマインダー作成
    const reminder = createReminder(
        targetChannel.id,
        message,
        remindAt,
        interaction.user.id,
        interaction.guildId,
    );

    if (!reminder) {
        await interaction.reply({
            content: "❌ リマインダーの登録に失敗しました。\n",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // ボタンを作成
    const row = buildReminderButtons(reminder.id);

    await interaction.reply({
        content: buildReminderMessage(reminder),
        components: [row],
    });

    // リプライメッセージを取得
    const replyMessage = await interaction.fetchReply();

    // リプライメッセージのIDを保存
    updateReminder(reminder.id, {
        replyMessageId: replyMessage.id,
        replyChannelId: replyMessage.channelId,
    });
}
