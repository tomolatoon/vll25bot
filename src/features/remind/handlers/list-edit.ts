import {
    ActionRowBuilder,
    type ButtonInteraction,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import type { ButtonHandler } from "../../../core/types";
import { reminderService } from "../reminder-service";
import { decodeState } from "../utils/list";
import { LIST_EDIT_PREFIX } from "../utils/ui";

export const listEditHandler: ButtonHandler = {
    idPrefix: LIST_EDIT_PREFIX,
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guildId) return;

        const { selectedId } = decodeState(
            interaction.customId,
            interaction.guildId,
            interaction.user.id,
        );
        if (selectedId) {
            // 編集ロジック（モーダル表示）
            const reminder = await reminderService.getReminderById(selectedId);
            if (reminder) {
                if (reminder.createdBy !== interaction.user.id) {
                    await interaction.reply({
                        content:
                            "❌ 自分が登録したリマインダーのみ編集できます。",
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }
                // モーダル作成
                const modal = new ModalBuilder()
                    .setCustomId(`remind_edit_modal:${selectedId}`)
                    .setTitle("リマインダー編集");
                const msgInput = new TextInputBuilder()
                    .setCustomId("message")
                    .setLabel("メッセージ")
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(reminder.message);
                const dateInput = new TextInputBuilder()
                    .setCustomId("datetime")
                    .setLabel("日時")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("例: 明日 9:00")
                    .setRequired(false);

                const row1 =
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                        msgInput,
                    );
                const row2 =
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                        dateInput,
                    );

                modal.addComponents(row1, row2);
                await interaction.showModal(modal);
            } else {
                await interaction.reply({
                    content: "❌ リマインダーが見つかりません。",
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    },
};

export default listEditHandler;
