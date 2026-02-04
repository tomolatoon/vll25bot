/**
 * remind-handlers.ts - リマインダー操作の共通ハンドラー
 *
 * ボタン操作（編集、削除、詳細表示、更新）のロジックを集約します。
 */

import {
    ActionRowBuilder,
    type AnySelectMenuInteraction,
    type ButtonInteraction,
    type ChatInputCommandInteraction,
    MessageFlags,
    ModalBuilder,
    type TextChannel,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { cancelReminder } from "./remind";
import {
    LIST_EDIT_PREFIX,
    buildReminderButtons,
    buildReminderMessage,
} from "./remind-ui";
import { type ReminderData, getReminderById } from "../reminder";

/**
 * リマインダー詳細を表示する
 * @param interaction インタラクション
 * @param reminderId リマインダーID
 */
export async function handleReminderShow(
    interaction:
        | ButtonInteraction
        | AnySelectMenuInteraction
        | ChatInputCommandInteraction,
    reminderId: string,
): Promise<void> {
    const reminder = getReminderById(reminderId);
    if (!reminder) {
        await interaction.reply({
            content: `❌ リマインダー \`${reminderId}\` が見つかりません。`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const content = buildReminderMessage(reminder);
    const row = buildReminderButtons(reminder.id);

    await interaction.reply({
        content,
        components: [row],
        flags: MessageFlags.Ephemeral,
    });
}

/**
 * リマインダー編集モーダルを表示する
 * @param interaction インタラクション
 * @param reminderId リマインダーID
 */
export async function handleReminderEdit(
    interaction: ButtonInteraction | AnySelectMenuInteraction,
    reminderId: string,
): Promise<void> {
    const reminder = getReminderById(reminderId);

    if (!reminder) {
        await interaction.reply({
            content: "❌ リマインダーが見つかりません。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // 権限チェック: 自分が作成したリマインダーのみ編集可能
    if (reminder.createdBy !== interaction.user.id) {
        await interaction.reply({
            content: "❌ 自分が登録したリマインダーのみ編集できます。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // LIST_EDIT_PREFIX は "remind_edit_modal" を想定（remind-ui.ts等での定義と合わせる必要あり）
    // 現在 remind-ui.ts に LIST_EDIT_PREFIX はあるが、これは "remind_list_edit" かもしれない
    // モーダルIDは "remind_edit_modal:{id}" とする
    const MODAL_ID_PREFIX = "remind_edit_modal";

    const modal = new ModalBuilder()
        .setCustomId(`${MODAL_ID_PREFIX}:${reminderId}`)
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
        .setPlaceholder(
            `現在: ${remindAt.toLocaleString("ja-JP")} (例: 明日 10:00)`,
        )
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(datetimeInput),
    );

    await interaction.showModal(modal);
}

/**
 * リマインダー削除の結果型
 */
export interface CancelResult {
    success: boolean;
    reason?: string;
    reminder?: ReminderData;
}

/**
 * リマインダーを削除し、結果を返す
 * 副作用: 元メッセージ（登録完了通知）を「削除済み」に更新する
 * UI応答: この関数では行わない
 *
 * @param interaction インタラクション
 * @param reminderId リマインダーID
 */
export async function handleReminderCancel(
    interaction: ButtonInteraction | ChatInputCommandInteraction,
    reminderId: string,
): Promise<CancelResult> {
    const reminder = getReminderById(reminderId);

    // 実際に削除を実行
    const result = cancelReminder(reminderId, interaction.user.id);

    if (result.success && reminder) {
        // 元メッセージを更新（登録解除状態にする）
        if (reminder.replyMessageId && reminder.replyChannelId) {
            try {
                const channel = (await interaction.client.channels.fetch(
                    reminder.replyChannelId,
                )) as TextChannel | null;

                if (channel) {
                    const replyMessage = await channel.messages.fetch(
                        reminder.replyMessageId,
                    );
                    if (replyMessage) {
                        try {
                            await replyMessage.edit({
                                content: `🗑️ リマインダー \`${reminderId}\` を解除しました。`,
                                components: [],
                            });
                        } catch (e) {
                            // メッセージが見つからない、権限がないなどの場合は無視
                            console.error(
                                "Failed to edit original message:",
                                e,
                            );
                        }
                    }
                }
            } catch (error) {
                // チャンネルが見つからない場合などは無視
            }
        }
    }

    return { ...result, reminder };
}

/**
 * リマインダー表示を最新状態に更新する
 * @param interaction インタラクション
 * @param reminderId リマインダーID
 */
export async function handleReminderReload(
    interaction: ButtonInteraction,
    reminderId: string,
): Promise<void> {
    const reminder = getReminderById(reminderId);

    if (!reminder) {
        // 削除済みの場合
        await interaction.update({
            content: `❓ リマインダー \`${reminderId}\` は既に解除済みです。`,
            components: [],
        });
        return;
    }

    // メッセージとボタンを最新状態で更新
    await interaction.update({
        content: buildReminderMessage(reminder),
        components: [buildReminderButtons(reminder.id)],
    });
}
