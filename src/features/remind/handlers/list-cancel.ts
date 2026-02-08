import { type ButtonInteraction, MessageFlags } from "discord.js";
import type { ButtonHandler } from "../../../core/types";
import { reminderService } from "../reminder-service";
import { decodeState, encodeState } from "../utils/list";
import { renderReminderList } from "../utils/ui";
import {
    LIST_CANCEL_PREFIX,
    LIST_RELOAD_PREFIX,
    buildCancelEmbed,
    buildCancelSuccessEmbed,
    buildCancelledButtons,
} from "../utils/ui";

export const listCancelHandler: ButtonHandler = {
    idPrefix: LIST_CANCEL_PREFIX,
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guildId) return;
        // キャンセル処理は時間がかかる可能性があるので deferUpdate
        await interaction.deferUpdate();

        const { selectedId } = decodeState(
            interaction.customId,
            interaction.guildId,
            interaction.user.id,
        );

        if (selectedId) {
            const result = await reminderService.cancel(
                selectedId,
                interaction.user.id,
                interaction.guildId,
            );
            if (result.success) {
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
                                components: [
                                    buildCancelledButtons(reminder.id),
                                ],
                            });
                        }
                    } catch (error) {
                        // エラーは無視（メッセージが既に削除されている場合など）
                    }
                }

                // customId からデコードして state を取得
                const { state } = decodeState(
                    interaction.customId,
                    interaction.guildId,
                    interaction.user.id,
                );
                // 先にリストを更新
                await renderReminderList(interaction, state);

                // その後で完了メッセージを送信
                await interaction.followUp({
                    embeds: [buildCancelSuccessEmbed(reminder)],
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.followUp({
                    content:
                        "❌ 解除に失敗しました（権限がないか、既に削除されています）。",
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    },
};

export default listCancelHandler;
