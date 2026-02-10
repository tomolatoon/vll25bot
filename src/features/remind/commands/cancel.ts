import {
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandSubcommandBuilder,
} from "discord.js";
import { buildCancelledButtons } from "../components/actions";
import {
    buildCancelEmbed,
    buildCancelSuccessEmbed,
} from "../components/embeds";
import { reminderService } from "../services/reminder-service";
import { validateReminderForUpdate } from "../utils/validation";

const data = new SlashCommandSubcommandBuilder()
    .setName("cancel")
    .setDescription("リマインダーを解除します")
    .addStringOption((option) =>
        option
            .setName("id")
            .setDescription("解除するリマインダーのID")
            .setRequired(true),
    );

async function execute(interaction: ChatInputCommandInteraction) {
    const id = interaction.options.getString("id", true);
    if (!interaction.guildId) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await reminderService.cancel(
        id,
        interaction.user.id,
        interaction.guildId,
    );

    if (!result.success) {
        if (result.reason === "not_owner") {
            await interaction.editReply({
                content: "❌ 自分が登録したリマインダーのみ解除できます。",
            });
        } else {
            await interaction.editReply({
                content: `❓ リマインダー \`${id}\` は既に解除済みか存在しません。`,
            });
        }
        return;
    }

    const { reminder } = result;

    // 元のメッセージを「キャンセル済み」に更新
    if (reminder.replyMessageId && reminder.replyChannelId) {
        try {
            const channel = await interaction.client.channels.fetch(
                reminder.replyChannelId,
            );
            if (channel?.isTextBased()) {
                const message = await channel.messages.fetch(
                    reminder.replyMessageId,
                );

                await message.edit({
                    embeds: [buildCancelEmbed(reminder)],
                    components: [buildCancelledButtons(reminder.id)],
                });
            }
        } catch (error) {
            // メッセージが見つからない場合などは無視
        }
    }

    // 完了レスポンス
    await interaction.editReply({
        embeds: [buildCancelSuccessEmbed(reminder)],
    });
}

export default { data, execute };
