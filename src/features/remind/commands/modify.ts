import {
    ChannelType,
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandSubcommandBuilder,
    type TextChannel,
} from "discord.js";
import { buildReminderButtons } from "../components/actions";
import {
    buildReminderEmbed,
    buildUpdateResponseEmbed,
} from "../components/embeds";
import { reminderService } from "../reminder-service";
import {
    buildChangesArray,
    validateDateTimeInput,
    validateReminderForUpdate,
} from "../utils/validation";

const data = new SlashCommandSubcommandBuilder()
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

async function execute(interaction: ChatInputCommandInteraction) {
    const id = interaction.options.getString("id", true);
    const newMessage = interaction.options.getString("message") || undefined;
    const datetimeStr = interaction.options.getString("datetime") || undefined;
    const newChannel =
        (interaction.options.getChannel("channel") as TextChannel | null) ||
        undefined;

    if (!interaction.guildId) return;

    // 1. Validation
    const validation = await validateReminderForUpdate(
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

    // 2. DateTime Validation
    const dateValidation = validateDateTimeInput(datetimeStr);
    if (!dateValidation.success) {
        await interaction.reply({
            content: `❌ ${dateValidation.error}`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // 3. Check Updates
    if (!newMessage && !dateValidation.date && !newChannel) {
        await interaction.reply({
            content: "❌ 変更する項目を少なくとも1つ指定してください。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // 4. Update
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const updated = await reminderService.update(id, {
        message: newMessage,
        remindAt: dateValidation.date?.getTime(),
        channelId: newChannel?.id,
    });

    if (!updated) {
        await interaction.editReply({
            content: "❌ リマインダーの更新に失敗しました。",
        });
        return;
    }

    // 5. Build Changes
    const changes = buildChangesArray({
        message: newMessage,
        remindAt: dateValidation.date,
        channelId: newChannel?.id,
    });

    // 6. Update Original Message
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
                    content: "",
                    embeds: [buildReminderEmbed(updated)],
                    components: [buildReminderButtons(updated.id)],
                });
            }
        } catch (error) {
            // Ignore
        }
    }

    // 7. Reply
    const responseEmbed = buildUpdateResponseEmbed(updated, changes);

    await interaction.editReply({
        embeds: [responseEmbed],
    });
}

export default { data, execute };
