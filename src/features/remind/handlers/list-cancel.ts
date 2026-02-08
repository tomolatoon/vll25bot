import { type ButtonInteraction, MessageFlags } from "discord.js";
import type { ButtonHandler } from "../../../core/types";
import { buildCancelledButtons } from "../components/actions";
import { buildCancelEmbed } from "../components/embeds";
import { LIST_CANCEL_PREFIX } from "../constants";
import { reminderService } from "../reminder-service";
import { renderReminderList } from "../services/renderer";
import { decodeState } from "../utils/list";
import { validateReminderForUpdate } from "../utils/validation";

export const listCancelHandler: ButtonHandler = {
    idPrefix: LIST_CANCEL_PREFIX,
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guildId) return;

        const { state, selectedId } = decodeState(
            interaction.customId,
            interaction.guildId,
            interaction.user.id,
        );

        if (selectedId) {
            // 検証
            const validation = await validateReminderForUpdate(
                selectedId,
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

            const reminder = validation.reminder;

            // 削除
            await reminderService.delete(selectedId);

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
                    // エラーは無視（メッセージが既に削除されている場合など）
                }
            }
        }

        // リスト再描画 (選択解除)
        await renderReminderList(interaction, state);
    },
};

export default listCancelHandler;
