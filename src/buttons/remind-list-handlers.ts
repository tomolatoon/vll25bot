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
    type TextChannel,
    type TextInputBuilder,
} from "discord.js";
import { BUTTON_ID_REMIND_CANCEL, cancelReminder } from "../commands/remind";
import { buildReminderButtons } from "../commands/remind";
import {
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
    buildListContent,
    buildOtherNavButtons,
    buildPaginationButtons,
    buildSelectMenu,
    decodeState,
    encodeState,
    filterAndSortReminders,
    getPageItems,
    getTotalPages,
} from "../lib/remind-list";
import { getReminderById, getRemindersByGuild } from "../reminder";
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

    const content = buildListContent(pageItems, state, totalPages);
    const selectMenu = buildSelectMenu(pageItems, state, selectedId);
    const actionButtons = buildActionButtons(state, selectedId);
    const navButtons = buildPaginationButtons(state, totalPages);
    const otherNavButtons = buildOtherNavButtons(state);

    await interaction.update({
        content,
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

        const content = buildListContent(pageItems, state, totalPages);
        const selectMenu = buildSelectMenu(pageItems, state);
        const actionButtons = buildActionButtons(state);
        const navButtons = buildPaginationButtons(state, totalPages);
        const otherNavButtons = buildOtherNavButtons(state);

        await interaction.update({
            content,
            components: [selectMenu, actionButtons, navButtons, otherNavButtons],
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

        const content = buildListContent(pageItems, state, totalPages);
        const selectMenu = buildSelectMenu(pageItems, state);
        const actionButtons = buildActionButtons(state);
        const navButtons = buildPaginationButtons(state, totalPages);
        const otherNavButtons = buildOtherNavButtons(state);

        await interaction.update({
            content,
            components: [selectMenu, actionButtons, navButtons, otherNavButtons],
        });
    },
};

/**
 * ページ指定ボタンハンドラー（モーダルを表示）
 */
export const remindListPageHandler: ButtonHandler = {
    idPrefix: LIST_NAV_PAGE_PREFIX,

    async execute(interaction: ButtonInteraction, _id: string): Promise<void> {
        const {
            ModalBuilder,
            TextInputBuilder,
            TextInputStyle,
            ActionRowBuilder,
        } = await import("discord.js");

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

        const row =
            new ActionRowBuilder<TextInputBuilder>().addComponents(pageInput);
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

        const content = buildListContent(pageItems, state, totalPages);
        const selectMenu = buildSelectMenu(pageItems, state);
        const actionButtons = buildActionButtons(state);
        const navButtons = buildPaginationButtons(state, totalPages);
        const otherNavButtons = buildOtherNavButtons(state);

        await interaction.update({
            content,
            components: [selectMenu, actionButtons, navButtons, otherNavButtons],
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

        const reminder = getReminderById(selectedId);
        if (!reminder) {
            await interaction.reply({
                content: `❌ リマインダー \`${selectedId}\` が見つかりません。`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const remindAt = new Date(reminder.remindAt);
        const createdAt = reminder.createdAt
            ? new Date(reminder.createdAt).toLocaleString("ja-JP")
            : "不明";

        const content = `🔍 **リマインダー詳細**

🆔 **ID**: \`${reminder.id}\`
📅 **日時**: ${remindAt.toLocaleString("ja-JP")}
📢 **チャンネル**: <#${reminder.channelId}>
👤 **作成者**: <@${reminder.createdBy}>
📆 **作成日時**: ${createdAt}
📝 **メッセージ**:
${reminder.message}`;

        const row = buildReminderButtons(reminder.id);

        await interaction.reply({
            content,
            components: [row],
            flags: MessageFlags.Ephemeral,
        });
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

        const reminder = getReminderById(selectedId);
        if (!reminder) {
            await interaction.reply({
                content: `❌ リマインダー \`${selectedId}\` が見つかりません。`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 編集モーダルを表示（既存の remind-edit ボタンと同じ処理）
        const {
            ModalBuilder,
            TextInputBuilder,
            TextInputStyle,
            ActionRowBuilder,
        } = await import("discord.js");

        const modal = new ModalBuilder()
            .setCustomId(`remind_edit_modal:${selectedId}`)
            .setTitle("リマインダー編集");

        const messageInput = new TextInputBuilder()
            .setCustomId("message")
            .setLabel("メッセージ")
            .setStyle(TextInputStyle.Paragraph)
            .setValue(reminder.message)
            .setRequired(false);

        const datetimeInput = new TextInputBuilder()
            .setCustomId("datetime")
            .setLabel("日時 (例: 2026/01/15 9:00, 明日 9:00)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("変更しない場合は空欄")
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(datetimeInput),
        );

        await interaction.showModal(modal);
    },
};

/**
 * 削除ボタンハンドラー
 */
export const remindListCancelHandler: ButtonHandler = {
    idPrefix: LIST_CANCEL_PREFIX,

    async execute(interaction: ButtonInteraction, _id: string): Promise<void> {
        const { state, selectedId } = decodeState(
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

        // 削除前にデータを取得（元メッセージ更新用）
        const reminder = getReminderById(selectedId);
        // 存在しない場合は cancelReminder でエラーになるのでここではチェックだけしてスルーでもいいが、
        // メッセージ更新のために必要

        const result = cancelReminder(selectedId, interaction.user.id);

        if (!result.success) {
            const errorMessages = {
                not_found: "リマインダーが見つかりません。",
                wrong_guild: "このサーバーのリマインダーではありません。",
                not_owner: "自分が登録したリマインダーのみ解除できます。",
                already_done: "既に実行済みか解除済みです。",
            };
            await interaction.reply({
                content: `❌ ${errorMessages[result.reason]}`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 元メッセージを更新（登録解除状態にする）
        if (reminder?.replyMessageId && reminder.replyChannelId) {
            try {
                const channel = (await interaction.client.channels.fetch(
                    reminder.replyChannelId,
                )) as TextChannel | null;

                if (channel) {
                    const replyMessage = await channel.messages.fetch(
                        reminder.replyMessageId,
                    );
                    if (replyMessage) {
                        await replyMessage.edit({
                            content: `🗑️ リマインダー \`${selectedId}\` を解除しました。`,
                            components: [],
                        });
                    }
                }
            } catch (error) {
                // 無視
            }
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
