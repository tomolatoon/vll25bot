import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import type { ModalHandler } from "../../../core/types";
import { logger } from "../../../utils/logger";
import { reminderService } from "../reminder-service";
import { decodeState, encodeState } from "../utils/list";
import {
    LIST_PAGE_JUMP_PREFIX,
    LIST_RELOAD_PREFIX,
    buildReminderButtons,
    buildReminderEmbed,
    buildUpdateResponseEmbed,
} from "../utils/ui";
import { buildChangesArray, validateDateTimeInput } from "../utils/validation";
import { renderReminderList } from "../utils/ui";

const editModalHandler: ModalHandler = {
    idPrefix: "remind_edit_modal:",
    type: "MODAL",
    async execute(interaction: ModalSubmitInteraction) {
        const reminderId = interaction.customId.split(":")[1];
        const newMessage = interaction.fields.getTextInputValue("message");
        const datetimeStr = interaction.fields.getTextInputValue("datetime");

        // 検証
        const dateValidation = validateDateTimeInput(datetimeStr || undefined);
        if (!dateValidation.success) {
            await interaction.reply({
                content: `❌ ${dateValidation.error}`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 変更内容を特定するために元のデータを取得
        const original = await reminderService.getReminderById(reminderId);
        
        // 更新
        const updated = await reminderService.update(reminderId, {
            message: newMessage,
            remindAt: dateValidation.date?.getTime(),
        });

        if (!updated || !original) {
            await interaction.reply({
                content:
                    "❌ リマインダーの更新に失敗しました（見つからないか、権限がありません）。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 変更内容のリスト作成
        const changes = buildChangesArray({
            message: original.message !== newMessage ? newMessage : undefined,
            remindAt: original.remindAt !== (dateValidation.date?.getTime() ?? original.remindAt) ? dateValidation.date : undefined,
        });

        // 元のメッセージを更新（ID表示など）
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
                        embeds: [buildReminderEmbed(updated)],
                        components: [buildReminderButtons(updated.id)],
                    });
                }
            } catch (error) {
                // 無視（メッセージ削除済みなど）
            }
        }

        const responseEmbed = buildUpdateResponseEmbed(
            updated,
            changes,
        );

        await interaction.reply({
            embeds: [responseEmbed],
            flags: MessageFlags.Ephemeral,
        });
    },
};

const pageJumpModalHandler: ModalHandler = {
    idPrefix: LIST_PAGE_JUMP_PREFIX,
    type: "MODAL",
    async execute(interaction: ModalSubmitInteraction) {
        logger.info(
            `🔍 pageJumpModalHandler executing. customId: ${interaction.customId}`,
        );
        if (!interaction.guildId) return;

        const input = interaction.fields.getTextInputValue("page");
        const pageNum = Number.parseInt(input, 10);

        if (Number.isNaN(pageNum) || pageNum < 1) {
            await interaction.reply({
                content: "❌ 有効なページ番号を入力してください。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // モーダルのcustomIdから現在の状態をデコード
        // フォーマット: remind_list_jump:<encoded_state>
        const { state } = decodeState(
            interaction.customId,
            interaction.guildId,
            interaction.user.id,
        );

        // ページ番号を更新 (0始まり)
        state.page = pageNum - 1;

        // 新しい状態でリストを再描画
        await renderReminderList(interaction, state);
    },
};

export default [editModalHandler, pageJumpModalHandler];
