/**
 * remind-list-handlers.ts - リマインダー一覧のボタン/Select Menu ハンドラー
 *
 * ページネーション、リマインダー選択、操作ボタンを処理する
 */

import {
    ActionRowBuilder,
    type AnySelectMenuInteraction,
    type ButtonInteraction,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import {
    BUTTON_ID_REMIND_CANCEL,
    LIST_CANCEL_PREFIX,
    LIST_EDIT_PREFIX,
    LIST_NAV_NEXT_PREFIX,
    LIST_NAV_PAGE_PREFIX,
    LIST_NAV_PREV_PREFIX,
    LIST_ORDER_PREFIX,
    LIST_RELOAD_PREFIX,
    LIST_SELECT_PREFIX,
    LIST_SHOW_PREFIX,
    buildActionButtons,
    buildListEmbed, // Changed
    buildOtherNavButtons,
    buildPaginationButtons,
    buildSelectMenu,
} from "../lib/remind-ui";
import {
    handleReminderCancel,
    handleReminderEdit,
    handleReminderShow,
} from "../lib/remind-handlers";
import {
    decodeState,
    filterAndSortReminders,
    getPageItems,
    getTotalPages,
} from "../lib/remind-list";
import { getRemindersByGuild } from "../reminder"; // getReminderById は使わなくなるはず（共通ハンドラーがやるから）
import type { ButtonHandler, SelectMenuHandler } from "../types";

/**
 * 一覧表示を更新する共通処理
 */
async function updateListView(
    interaction: ButtonInteraction | AnySelectMenuInteraction,
    customId: string,
    selectedId?: string,
): Promise<void> {
    const { state } = decodeState(
        customId,
        interaction.guildId ?? "",
        interaction.user.id,
    );

    const allReminders = getRemindersByGuild(state.guildId);
    const filtered = filterAndSortReminders(allReminders, state);
    const totalPages = getTotalPages(filtered.length);

    // ページ番号の補正（削除等でページが減った場合の対応）
    if (state.page >= totalPages && totalPages > 0) {
        state.page = totalPages - 1;
    }

    const pageItems = getPageItems(filtered, state.page);

    if (filtered.length === 0) {
        await interaction.update({
            content: "📭 リマインダーはありません。",
            components: [],
        });
        return;
    }

    const embed = buildListEmbed(pageItems, state, totalPages);
    const selectMenu = buildSelectMenu(pageItems, state, selectedId);
    const actionButtons = buildActionButtons(state, selectedId);
    const navButtons = buildPaginationButtons(state, totalPages);
    const otherNavButtons = buildOtherNavButtons(state);

    await interaction.update({
        content: "",
        embeds: [embed],
        components: [selectMenu, actionButtons, navButtons, otherNavButtons],
    });
}

/**
 * Select Menu ハンドラー（リマインダー選択）
 */
export const remindListSelectHandler: SelectMenuHandler = {
    idPrefix: LIST_SELECT_PREFIX,

    async execute(
        interaction: AnySelectMenuInteraction,
        _id: string,
    ): Promise<void> {
        const selectedId = interaction.values[0];
        await updateListView(interaction, interaction.customId, selectedId);
    },
};

/**
 * 前へボタンハンドラー
 */
export const remindListPrevHandler: ButtonHandler = {
    idPrefix: LIST_NAV_PREV_PREFIX,

    async execute(interaction: ButtonInteraction, _id: string): Promise<void> {
        const { state } = decodeState(
            interaction.customId,
            interaction.guildId ?? "",
            interaction.user.id,
        );
        state.page = Math.max(0, state.page - 1);

        const allReminders = getRemindersByGuild(state.guildId);
        const filtered = filterAndSortReminders(allReminders, state);
        const totalPages = getTotalPages(filtered.length);
        const pageItems = getPageItems(filtered, state.page);

        const embed = buildListEmbed(pageItems, state, totalPages);
        const selectMenu = buildSelectMenu(pageItems, state);
        const actionButtons = buildActionButtons(state);
        const navButtons = buildPaginationButtons(state, totalPages);
        const otherNavButtons = buildOtherNavButtons(state);

        await interaction.update({
            content: "",
            embeds: [embed],
            components: [
                selectMenu,
                actionButtons,
                navButtons,
                otherNavButtons,
            ],
        });
    },
};

/**
 * 次へボタンハンドラー
 */
export const remindListNextHandler: ButtonHandler = {
    idPrefix: LIST_NAV_NEXT_PREFIX,

    async execute(interaction: ButtonInteraction, _id: string): Promise<void> {
        const { state } = decodeState(
            interaction.customId,
            interaction.guildId ?? "",
            interaction.user.id,
        );
        const allReminders = getRemindersByGuild(state.guildId);
        const filtered = filterAndSortReminders(allReminders, state);
        const totalPages = getTotalPages(filtered.length);

        state.page = Math.min(totalPages - 1, state.page + 1);
        const pageItems = getPageItems(filtered, state.page);

        const embed = buildListEmbed(pageItems, state, totalPages);
        const selectMenu = buildSelectMenu(pageItems, state);
        const actionButtons = buildActionButtons(state);
        const navButtons = buildPaginationButtons(state, totalPages);
        const otherNavButtons = buildOtherNavButtons(state);

        await interaction.update({
            content: "",
            embeds: [embed],
            components: [
                selectMenu,
                actionButtons,
                navButtons,
                otherNavButtons,
            ],
        });
    },
};

/**
 * ページ指定ボタンハンドラー（モーダルを表示）
 */
export const remindListPageHandler: ButtonHandler = {
    idPrefix: LIST_NAV_PAGE_PREFIX,

    async execute(interaction: ButtonInteraction, _id: string): Promise<void> {
        const { state } = decodeState(
            interaction.customId,
            interaction.guildId ?? "",
            interaction.user.id,
        );
        const allReminders = getRemindersByGuild(state.guildId);
        const filtered = filterAndSortReminders(allReminders, state);
        const totalPages = getTotalPages(filtered.length);

        const modal = new ModalBuilder()
            .setCustomId(`remind_page_jump:${interaction.customId}`)
            .setTitle("ページ指定");

        const pageInput = new TextInputBuilder()
            .setCustomId("page_number")
            .setLabel(`ページ番号を入力 (1〜${totalPages})`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`1〜${totalPages}`)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(3);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
            pageInput,
        );
        modal.addComponents(row);

        await interaction.showModal(modal);
    },
};

/**
 * ソート順切替ボタンハンドラー
 */
export const remindListOrderHandler: ButtonHandler = {
    idPrefix: LIST_ORDER_PREFIX,

    async execute(interaction: ButtonInteraction, _id: string): Promise<void> {
        const { state } = decodeState(
            interaction.customId,
            interaction.guildId ?? "",
            interaction.user.id,
        );
        state.order = state.order === "asc" ? "desc" : "asc";
        state.page = 0; // ソート変更時は最初のページに戻る

        const allReminders = getRemindersByGuild(state.guildId);
        const filtered = filterAndSortReminders(allReminders, state);
        const totalPages = getTotalPages(filtered.length);
        const pageItems = getPageItems(filtered, state.page);

        const embed = buildListEmbed(pageItems, state, totalPages);
        const selectMenu = buildSelectMenu(pageItems, state);
        const actionButtons = buildActionButtons(state);
        const navButtons = buildPaginationButtons(state, totalPages);
        const otherNavButtons = buildOtherNavButtons(state);

        await interaction.update({
            content: "",
            embeds: [embed],
            components: [
                selectMenu,
                actionButtons,
                navButtons,
                otherNavButtons,
            ],
        });
    },
};

/**
 * 詳細表示ボタンハンドラー
 */
export const remindListShowHandler: ButtonHandler = {
    idPrefix: LIST_SHOW_PREFIX,

    async execute(interaction: ButtonInteraction, _id: string): Promise<void> {
        const { selectedId } = decodeState(
            interaction.customId,
            interaction.guildId ?? "",
            interaction.user.id,
        );

        if (!selectedId) {
            await interaction.reply({
                content: "❌ リマインダーを選択してください。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await handleReminderShow(interaction, selectedId);
    },
};

/**
 * 編集ボタンハンドラー（編集モーダルを表示）
 */
export const remindListEditHandler: ButtonHandler = {
    idPrefix: LIST_EDIT_PREFIX,

    async execute(interaction: ButtonInteraction, _id: string): Promise<void> {
        const { selectedId } = decodeState(
            interaction.customId,
            interaction.guildId ?? "",
            interaction.user.id,
        );

        if (!selectedId) {
            await interaction.reply({
                content: "❌ リマインダーを選択してください。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await handleReminderEdit(interaction, selectedId);
    },
};

/**
 * 削除ボタンハンドラー
 */
export const remindListCancelHandler: ButtonHandler = {
    idPrefix: LIST_CANCEL_PREFIX,

    async execute(interaction: ButtonInteraction, _id: string): Promise<void> {
        const { selectedId } = decodeState(
            interaction.customId,
            interaction.guildId ?? "",
            interaction.user.id,
        );

        if (!selectedId) {
            await interaction.reply({
                content: "❌ リマインダーを選択してください。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const result = await handleReminderCancel(interaction, selectedId);

        if (!result.success) {
            const errorMessages: Record<string, string> = {
                not_found: "リマインダーが見つかりません。",
                wrong_guild: "このサーバーのリマインダーではありません。",
                not_owner: "自分が登録したリマインダーのみ解除できます。",
                already_done: "既に実行済みか解除済みです。",
            };
            const reason = result.reason ?? "unknown"; // Default value for safety
            await interaction.reply({
                content: `❌ ${errorMessages[reason] ?? "エラーが発生しました。"}`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 削除後にリストを更新（選択状態は解除）
        await updateListView(interaction, interaction.customId, undefined);

        // 通知を送る
        await interaction.followUp({
            content: `🗑️ リマインダー \`${selectedId}\` を解除しました。`,
            flags: MessageFlags.Ephemeral,
        });
    },
};

/**
 * 更新ボタンハンドラー
 */
export const remindListReloadHandler: ButtonHandler = {
    idPrefix: LIST_RELOAD_PREFIX,

    async execute(interaction: ButtonInteraction, _id: string): Promise<void> {
        const { selectedId } = decodeState(
            interaction.customId,
            interaction.guildId ?? "",
            interaction.user.id,
        );
        await updateListView(interaction, interaction.customId, selectedId);
        // Ephemeralメッセージは更新ボタン押しても特に出さない（画面が更新されるだけでわかる）
    },
};
