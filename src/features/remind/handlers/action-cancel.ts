import type { ButtonHandler } from "@core/types";
import { type ButtonInteraction, MessageFlags } from "discord.js";
import { buildCancelledButtons } from "../components/actions";
import { buildCancelEmbed } from "../components/embeds";
import { BUTTON_ID_REMIND_CANCEL } from "../constants";
import { reminderService } from "../services/reminder-service";
import { validateReminderForUpdate } from "../utils/validation";

export const cancelHandler: ButtonHandler = {
    idPrefix: BUTTON_ID_REMIND_CANCEL,
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        const reminderId = interaction.customId.split(":")[1];

        // 検証
        const validation = await validateReminderForUpdate(
            reminderId,
            interaction.user.id,
        );

        if (!validation.success) {
            await interaction.reply({
                content: `❌ ${validation.error}`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const reminder = validation.reminder;

        // 削除実行
        await reminderService.delete(reminderId);

        // キャンセル状態を表示するためにメッセージを更新
        // まず、元の登録メッセージ（もしあれば）を更新する
        // ただし、今押されたボタンのメッセージと同じ場合は editReply で更新されるのでスキップする
        if (
            reminder.replyMessageId &&
            reminder.replyChannelId &&
            reminder.replyMessageId !== interaction.message.id
        ) {
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
                // エラーは無視（メッセージが既に削除されている場合など）
            }
        }

        // 次に、インタラクション元のメッセージを更新する
        await interaction.update({
            content: "",
            embeds: [buildCancelEmbed(reminder)],
            components: [buildCancelledButtons(reminder.id)],
        });
    },
};

export default cancelHandler;
