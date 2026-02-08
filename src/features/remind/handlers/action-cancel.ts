import {
    type ButtonInteraction,
    EmbedBuilder,
    MessageFlags,
} from "discord.js";
import type { ButtonHandler } from "../../../core/types";
import { reminderService } from "../reminder-service";
import {
    BUTTON_ID_REMIND_CANCEL,
    REMIND_COLOR_INFO,
    buildCancelEmbed,
    buildCancelledButtons,
} from "../utils/ui";

export const cancelHandler: ButtonHandler = {
    idPrefix: `${BUTTON_ID_REMIND_CANCEL}:`,
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        await interaction.deferUpdate();
        const reminderId = interaction.customId.split(":")[1];
        const result = await reminderService.cancel(
            reminderId,
            interaction.user.id,
            interaction.guildId || "",
        );

        if (!result.success) {
            if (result.reason === "not_owner") {
                await interaction.followUp({
                    content: "❌ 自分が登録したリマインダーのみ解除できます。",
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.editReply({
                    content: "",
                    embeds: [
                        new EmbedBuilder()
                            .setColor(REMIND_COLOR_INFO)
                            .setDescription(
                                `❓ リマインダー \`${reminderId}\` は既に解除済みです。`,
                            ),
                    ],
                    components: [],
                });
            }
            return;
        }

        // キャンセル状態を表示するためにメッセージを更新
        // まず、元の登録メッセージ（もしあれば）を更新する
        // ただし、今押されたボタンのメッセージと同じ場合は editReply で更新されるのでスキップする
        if (
            result.reminder.replyMessageId &&
            result.reminder.replyChannelId &&
            result.reminder.replyMessageId !== interaction.message.id
        ) {
            try {
                const channel = await interaction.client.channels.fetch(
                    result.reminder.replyChannelId,
                );
                if (channel?.isTextBased()) {
                    const message = await channel.messages.fetch(
                        result.reminder.replyMessageId,
                    );
                    await message.edit({
                        embeds: [buildCancelEmbed(result.reminder)],
                        components: [
                            buildCancelledButtons(result.reminder.id),
                        ],
                    });
                }
            } catch (error) {
                // エラーは無視（メッセージが既に削除されている場合など）
            }
        }

        // 次に、インタラクション元のメッセージを更新する
        await interaction.editReply({
            content: "",
            embeds: [buildCancelEmbed(result.reminder)],
            components: [buildCancelledButtons(result.reminder.id)],
        });
    },
};

export default cancelHandler;
