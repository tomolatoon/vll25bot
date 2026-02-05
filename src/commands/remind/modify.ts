import {
    ChannelType,
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandSubcommandBuilder,
    type TextChannel,
    EmbedBuilder, // Added
} from "discord.js";
import {
    buildChangesArray,
    buildUpdateResponseEmbed, // Changed
    validateDateTimeInput,
    validateReminderForUpdate,
} from "../../lib/remind";
import {
    buildReminderButtons,
    buildReminderEmbed, // Changed
} from "../../lib/remind-ui";
import { updateReminder } from "../../reminder";

export const modifyCommand = new SlashCommandSubcommandBuilder()
    .setName("modify")
    .setDescription("リマインダーを編集します")
    .addStringOption((option) =>
        option
            .setName("id")
            .setDescription("編集するリマインダーのID")
            .setRequired(true),
    )
    .addStringOption((option) =>
        option
            .setName("message")
            .setDescription("新しいメッセージ")
            .setRequired(false),
    )
    .addStringOption((option) =>
        option
            .setName("datetime")
            .setDescription("新しい日時 (例: 2026/01/15 9:00, 明日 9:00)")
            .setRequired(false),
    )
    .addChannelOption((option) =>
        option
            .setName("channel")
            .setDescription("新しい送信先チャンネル")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false),
    );

/** リマインダー編集（コマンド） */
export async function handleModify(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    const id = interaction.options.getString("id", true);
    const newMessage = interaction.options.getString("message") || undefined;
    const datetimeStr = interaction.options.getString("datetime") || undefined;
    const newChannel =
        (interaction.options.getChannel("channel") as TextChannel | null) ||
        undefined;

    if (!interaction.guildId) return;

    // 1. バリデーション
    const validation = validateReminderForUpdate(
        id,
        interaction.user.id,
        interaction.guildId,
    );
    if (!validation.success) {
        await interaction.reply({
            content: `❌ ${validation.error}`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // 2. 日時のバリデーション
    const dateValidation = validateDateTimeInput(datetimeStr);
    if (!dateValidation.success) {
        await interaction.reply({
            content: `❌ ${dateValidation.error}`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // 3. 更新項目の確認
    if (!newMessage && !dateValidation.date && !newChannel) {
        await interaction.reply({
            content: "❌ 変更する項目を少なくとも1つ指定してください。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // 4. リマインダーを更新
    const updated = updateReminder(id, {
        message: newMessage,
        remindAt: dateValidation.date,
        channelId: newChannel?.id,
    });

    if (!updated) {
        await interaction.reply({
            content: "❌ リマインダーの更新に失敗しました。\n",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // 5. 変更内容を生成
    const changes = buildChangesArray({
        message: newMessage,
        remindAt: dateValidation.date,
        channel: newChannel,
    });

    // 6. 元メッセージを更新（存在する場合）
    if (updated.replyMessageId && updated.replyChannelId) {
        try {
            const channel = await interaction.client.channels.fetch(
                updated.replyChannelId,
            );
            if (channel?.isTextBased()) {
                const message = await channel.messages.fetch(
                    updated.replyMessageId,
                );
                await message.edit({
                    content: "", // Clear content
                    embeds: [buildReminderEmbed(updated)], // Changed
                    components: [buildReminderButtons(updated.id)],
                });
            }
        } catch (error) {
            // メッセージが削除されている等のエラーは無視
        }
    }

    // 7. 返信メッセージを生成して送信
    const responseEmbed = buildUpdateResponseEmbed(updated, changes); // Changed

    await interaction.reply({
        embeds: [responseEmbed], // Changed
        flags: MessageFlags.Ephemeral,
    });
}
