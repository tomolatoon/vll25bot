import {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";

/**
 * リマインダー編集用のモーダルを生成する
 */
export function buildEditReminderModal(
    reminderId: string,
    initialMessage: string,
): ModalBuilder {
    const modal = new ModalBuilder()
        .setCustomId(`remind_edit_modal:${reminderId}`)
        .setTitle("リマインダー編集");

    const messageInput = new TextInputBuilder()
        .setCustomId("message")
        .setLabel("メッセージ")
        .setStyle(TextInputStyle.Paragraph)
        .setValue(initialMessage)
        .setRequired(true);

    const datetimeInput = new TextInputBuilder()
        .setCustomId("datetime")
        .setLabel("日時 (例: 明日 9:00)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("現在日時を変更しない場合は空欄")
        .setRequired(false);

    const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(
        messageInput,
    );
    const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(
        datetimeInput,
    );

    modal.addComponents(row1, row2);
    return modal;
}
