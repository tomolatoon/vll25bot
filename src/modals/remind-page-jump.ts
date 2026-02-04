/**
 * remind-page-jump.ts - ページ番号指定モーダルハンドラー
 *
 * ページ番号を入力して指定ページにジャンプする
 */

import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import {
    buildActionButtons,
    buildListContent,
    buildOtherNavButtons,
    buildPaginationButtons,
    buildSelectMenu,
    decodeState,
    filterAndSortReminders,
    getPageItems,
    getTotalPages,
} from "../lib/remind-list";
import { getRemindersByGuild } from "../reminder";
import type { ModalHandler } from "../types";

export const remindPageJumpModal: ModalHandler = {
    idPrefix: "remind_page_jump",

    async execute(
        interaction: ModalSubmitInteraction,
        originalCustomId: string,
    ): Promise<void> {
        const pageNumberStr =
            interaction.fields.getTextInputValue("page_number");
        const pageNumber = Number.parseInt(pageNumberStr, 10);

        // 元のカスタムIDから状態を復元
        const { state } = decodeState(
            originalCustomId,
            interaction.guildId ?? "",
            interaction.user.id,
        );

        const allReminders = getRemindersByGuild(state.guildId);
        const filtered = filterAndSortReminders(allReminders, state);
        const totalPages = getTotalPages(filtered.length);

        // ページ番号のバリデーション
        if (
            Number.isNaN(pageNumber) ||
            pageNumber < 1 ||
            pageNumber > totalPages
        ) {
            await interaction.reply({
                content: `❌ 1〜${totalPages} の数値を入力してください。`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // ページを更新（0始まりに変換）
        state.page = pageNumber - 1;
        const pageItems = getPageItems(filtered, state.page);

        const content = buildListContent(pageItems, state, totalPages);
        const selectMenu = buildSelectMenu(pageItems, state);
        const actionButtons = buildActionButtons(state);
        const navButtons = buildPaginationButtons(state, totalPages);
        const otherNavButtons = buildOtherNavButtons(state);

        // リストを更新
        // interaction.message を使用して元のメッセージを更新
        if (interaction.message) {
            await interaction.message.edit({
                content,
                components: [
                    selectMenu,
                    actionButtons,
                    navButtons,
                    otherNavButtons,
                ],
            });
            // モーダル送信を確認（応答が必要）
            await interaction.deferUpdate();
        } else {
            // フォールバック: messageがない場合はエラーを返す
            await interaction.reply({
                content: "❌ リストの更新に失敗しました。",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
