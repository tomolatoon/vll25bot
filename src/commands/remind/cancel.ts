import {
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandSubcommandBuilder,
    type TextChannel,
} from "discord.js";
import { cancelReminder } from "../../lib/remind";
import { getReminderById } from "../../reminder";

export const cancelCommand = new SlashCommandSubcommandBuilder()
    .setName("cancel")
    .setDescription("リマインダーを解除します")
    .addStringOption((option) =>
        option
            .setName("id")
            .setDescription("解除するリマインダーのID")
            .setRequired(true),
    );

/** リマインダー解除 */
export async function handleCancel(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    const id = interaction.options.getString("id", true);
    if (!interaction.guildId) return;

    // 解除前にデータを取得（元メッセージ更新用）
    const reminder = getReminderById(id);

    const result = cancelReminder(id, interaction.user.id, interaction.guildId);

    if (!result.success) {
        const errorMessages = {
            not_found:
                "指定されたIDのリマインダーがこのサーバーに見つかりません。",
            wrong_guild:
                "指定されたIDのリマインダーがこのサーバーに見つかりません。",
            not_owner: "自分が登録したリマインダーのみ解除できます。",
            already_done: "既に実行済みか解除済みです。",
        };
        await interaction.reply({
            content: `❌ ${errorMessages[result.reason]}`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // 元メッセージを更新（登録解除状態にする）
    if (reminder?.replyMessageId && reminder.replyChannelId) {
        try {
            const channel = (await interaction.client.channels.fetch(
                reminder.replyChannelId,
            )) as TextChannel | null;

            if (channel) {
                const replyMessage = await channel.messages.fetch(
                    reminder.replyMessageId,
                );
                if (replyMessage) {
                    await replyMessage.edit({
                        content: `🗑️ リマインダー \`${id}\` を解除しました。`,
                        components: [],
                    });
                }
            }
        } catch (error) {
            // 無視
        }
    }

    await interaction.reply({
        content: `🗑️ リマインダー \`${id}\` を解除しました。`,
        flags: MessageFlags.Ephemeral,
    });
}
