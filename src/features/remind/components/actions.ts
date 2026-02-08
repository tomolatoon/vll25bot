import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
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
} from "../constants";
import type { Reminder } from "../types";
import { type ListState, encodeState } from "../utils/list";

/**
 * リマインダーのボタン一式を生成
 */
export function buildReminderButtons(
    reminderId: string,
): ActionRowBuilder<ButtonBuilder> {
    const editButton = new ButtonBuilder()
        .setCustomId(`remind_edit:${reminderId}`)
        .setLabel("編集")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("✏️");

    const copyIdButton = new ButtonBuilder()
        .setCustomId(`remind_copy_id:${reminderId}`)
        .setLabel("ID")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📋");

    const reloadButton = new ButtonBuilder()
        .setCustomId(`remind_reload:${reminderId}`)
        .setLabel("更新")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔄");

    const cancelButton = new ButtonBuilder()
        .setCustomId(`${BUTTON_ID_REMIND_CANCEL}:${reminderId}`)
        .setLabel("登録解除")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️");

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        editButton,
        copyIdButton,
        cancelButton,
    );
}

/**
 * キャンセル済みのためのボタン（無効化）を生成
 */
export function buildCancelledButtons(
    reminderId: string,
): ActionRowBuilder<ButtonBuilder> {
    const editButton = new ButtonBuilder()
        .setCustomId(`disabled_edit:${reminderId}`)
        .setLabel("編集")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("✏️")
        .setDisabled(true);

    const cancelButton = new ButtonBuilder()
        .setCustomId(`disabled_cancel:${reminderId}`)
        .setLabel("登録解除")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️")
        .setDisabled(true);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        editButton,
        cancelButton,
    );
}

/**
 * リマインダー選択用の Select Menu を生成する
 */
export function buildSelectMenu(
    reminders: Reminder[],
    state: ListState,
    selectedId?: string,
): ActionRowBuilder<StringSelectMenuBuilder> {
    const options = reminders.map((r, index) => {
        const date = new Date(r.remindAt);
        const dateStr = date.toLocaleString("ja-JP");
        const msgPreview =
            r.message.length > 20
                ? `${r.message.substring(0, 20)}...`
                : r.message;

        const emoji =
            ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"][index] ||
            `#${index + 1}`;

        return {
            label: `${emoji} ${dateStr}`,
            description: msgPreview,
            value: r.id,
            default: r.id === selectedId,
        };
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(encodeState(LIST_SELECT_PREFIX, state))
        .setPlaceholder("リマインダーを選択...")
        .addOptions(options);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        selectMenu,
    );
}

/**
 * 操作ボタン（詳細/編集/削除）を生成する
 */
export function buildActionButtons(
    state: ListState,
    selectedId?: string,
): ActionRowBuilder<ButtonBuilder> {
    const disabled = !selectedId;

    const showButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_SHOW_PREFIX, state, selectedId))
        .setLabel("詳細")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🔍")
        .setDisabled(disabled);

    const editButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_EDIT_PREFIX, state, selectedId))
        .setLabel("編集")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("✏️")
        .setDisabled(disabled);

    const cancelButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_CANCEL_PREFIX, state, selectedId))
        .setLabel("解除")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️")
        .setDisabled(disabled);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        showButton,
        editButton,
        cancelButton,
    );
}

/**
 * ナビゲーションボタン（前へ/ページ指定/次へ/順序切替）を生成する
 */
export function buildPaginationButtons(
    state: ListState,
    totalPages: number,
): ActionRowBuilder<ButtonBuilder> {
    const prevButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_NAV_PREV_PREFIX, state))
        .setLabel("前へ")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("◀")
        .setDisabled(state.page === 0);

    const pageButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_NAV_PAGE_PREFIX, state))
        .setLabel(`${state.page + 1}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary);

    const nextButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_NAV_NEXT_PREFIX, state))
        .setLabel("次へ")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("▶")
        .setDisabled(state.page >= totalPages - 1);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        prevButton,
        pageButton,
        nextButton,
    );
}

export function buildOtherNavButtons(
    state: ListState,
): ActionRowBuilder<ButtonBuilder> {
    const reloadButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_RELOAD_PREFIX, state))
        .setLabel("更新")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔄");

    const orderButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_ORDER_PREFIX, state))
        .setLabel(state.order === "asc" ? "昇順" : "降順")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(state.order === "asc" ? "⬆️" : "⬇️");

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        reloadButton,
        orderButton,
    );
}
