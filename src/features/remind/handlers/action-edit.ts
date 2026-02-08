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

export const editHandler: ButtonHandler = {
    idPrefix: "remind_edit:",
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        const reminderId = interaction.customId.split(":")[1];
        const reminder = await reminderService.getReminderById(reminderId);

        if (!reminder) {
            await interaction.reply({
                content: "❌ リマインダーが見つかりません。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (reminder.createdBy !== interaction.user.id) {
            await interaction.reply({
                content: "❌ 自分が登録したリマインダーのみ編集できます。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`remind_edit_modal:${reminderId}`)
            .setTitle("リマインダー編集");

        const messageInput = new TextInputBuilder()
            .setCustomId("message")
            .setLabel("メッセージ")
            .setStyle(TextInputStyle.Paragraph)
            .setValue(reminder.message)
            .setRequired(false);

        const remindAt = new Date(reminder.remindAt);
        const datetimeInput = new TextInputBuilder()
            .setCustomId("datetime")
            .setLabel("日時 (例: 2026/01/15 9:00, 明日 9:00)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`現在: ${remindAt.toLocaleString("ja-JP")}`)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                messageInput,
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                datetimeInput,
            ),
        );

        await interaction.showModal(modal);
    },
};

export default editHandler;
