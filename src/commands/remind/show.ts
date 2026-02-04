import {
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandSubcommandBuilder,
} from "discord.js";
import { buildReminderButtons } from "../../lib/remind-ui";
import { getReminderById } from "../../reminder";

export const showCommand = new SlashCommandSubcommandBuilder()
    .setName("show")
    .setDescription("リマインダーの詳細を表示します")
    .addStringOption((option) =>
        option
            .setName("id")
            .setDescription("表示するリマインダーのID")
            .setRequired(true),
    );

/** リマインダー詳細表示 */
export async function handleShow(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    if (!interaction.guildId) return;

    const id = interaction.options.getString("id", true);
    const reminder = getReminderById(id);

    if (!reminder) {
        await interaction.reply({
            content: `❌ リマインダー \`${id}\` が見つかりません。`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (reminder.guildId !== interaction.guildId) {
        await interaction.reply({
            content: "❌ このサーバーのリマインダーではありません。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const remindAt = new Date(reminder.remindAt);
    const createdAt = reminder.createdAt
        ? new Date(reminder.createdAt).toLocaleString("ja-JP")
        : "不明";

    const content = `🔍 **リマインダー詳細**

🆔 **ID**: \`${reminder.id}\`
📅 **日時**: ${remindAt.toLocaleString("ja-JP")}
📢 **チャンネル**: <#${reminder.channelId}>
👤 **作成者**: <@${reminder.createdBy}>
📆 **作成日時**: ${createdAt}
📝 **メッセージ**:
${reminder.message}`;

    // 操作ボタンを作成
    const row = buildReminderButtons(reminder.id);

    await interaction.reply({
        content,
        components: [row],
        flags: MessageFlags.Ephemeral,
    });
}
