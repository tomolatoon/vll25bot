import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} from "discord.js";
import type { ReminderData } from "../reminder";

/** リマインダー解除ボタンのIDプレフィックス */
export const BUTTON_ID_REMIND_CANCEL = "remind_cancel";

//Embed Colors
export const REMIND_COLOR_SUCCESS = 0x00ff00; // Green
export const REMIND_COLOR_INFO = 0x0099ff; // Blue
export const REMIND_COLOR_ERROR = 0xff0000; // Red
export const REMIND_COLOR_WARN = 0xffcc00; // Yellow (or similar)

/**
 * リマインダー情報のメッセージを生成
 * @param reminder リマインダーデータ
 * @returns フォーマットされたメッセージ
 */
/**
 * リマインダー情報のメッセージを生成
 * @deprecated プレーンテキストでのメッセージ生成は非推奨です。代わりに {@link buildReminderEmbed} を使用してください。
 * @param reminder リマインダーデータ
 * @returns フォーマットされたメッセージ
 */
export function buildReminderMessage(reminder: ReminderData): string {
    const remindAt = new Date(reminder.remindAt);
    return `✅ リマインダーを登録しました！

📅 **日時**: ${remindAt.toLocaleString("ja-JP")}
📝 **メッセージ**: ${reminder.message}
📢 **チャンネル**: <#${reminder.channelId}>
🆔 **ID**: \`${reminder.id}\`
`;
}

/**
 * リマインダー情報のEmbedを生成
 * @param reminder リマインダーデータ
 * @param titleTitle タイトル（デフォルト: "✅ リマインダーを登録しました！"）
 * @returns EmbedBuilder
 */
export function buildReminderEmbed(
    reminder: ReminderData,
    title = "✅ リマインダーを登録しました！",
): EmbedBuilder {
    const remindAt = new Date(reminder.remindAt);
    const unixTime = Math.floor(remindAt.getTime() / 1000);

    return new EmbedBuilder()
        .setColor(REMIND_COLOR_SUCCESS)
        .setTitle(title)
        .setDescription(reminder.message+"\n\u200b")
        .addFields(
            {
                name: "📅 日時",
                value: `<t:${unixTime}:S>`,
                inline: true,
            },
            {
                name: "📢 チャンネル",
                value: `<#${reminder.channelId}>`,
                inline: true,
            },
            {
                name: "🆔 ID",
                value: `\`${reminder.id}\``,
                inline: false,
            },
        );
}

/**
 * リマインダーのボタン一式を生成
 * @param reminderId リマインダーID
 * @returns ボタンを含む ActionRow
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

// --- Remind List UI Components ---

import { StringSelectMenuBuilder } from "discord.js";
import { type ListState, REMINDERS_PER_PAGE, encodeState } from "./remind-list";

/** ボタン/Select Menu のIDプレフィックス */
export const LIST_SELECT_PREFIX = "remind_list_select";
export const LIST_NAV_PREV_PREFIX = "remind_list_prev";
export const LIST_NAV_NEXT_PREFIX = "remind_list_next";
export const LIST_NAV_PAGE_PREFIX = "remind_list_page";
export const LIST_ORDER_PREFIX = "remind_list_order";
export const LIST_SHOW_PREFIX = "remind_list_show";
export const LIST_EDIT_PREFIX = "remind_list_edit";
export const LIST_CANCEL_PREFIX = "remind_list_cancel";
export const LIST_RELOAD_PREFIX = "remind_list_reload";

/**
 * 一覧のメッセージ内容を生成する
 *
 * @param reminders - 表示するリマインダー
 * @param state - ページネーション状態
 * @param totalPages - 合計ページ数
 * @returns フォーマットされたメッセージ
 */
/**
 * 一覧のメッセージ内容を生成する
 *
 * @deprecated プレーンテキストでの一覧生成は非推奨です。代わりに {@link buildListEmbed} を使用してください。
 * @param reminders - 表示するリマインダー
 * @param state - ページネーション状態
 * @param totalPages - 合計ページ数
 * @returns フォーマットされたメッセージ
 */
export function buildListContent(
    reminders: ReminderData[],
    state: ListState,
    totalPages: number,
): string {
    if (reminders.length === 0) {
        return "📭 リマインダーはありません。";
    }

    const orderLabel = state.order === "asc" ? "⬆️ 昇順" : "⬇️ 降順";
    const header = `📋 **リマインダー一覧** (${state.page + 1}/${totalPages}ページ) ${orderLabel}\n`;

    const list = reminders
        .map((r) => {
            const date = new Date(r.remindAt);
            const dateStr = date.toLocaleString("ja-JP");
            const msgPreview =
                r.message.length > 25
                    ? `${r.message.substring(0, 25)}...`
                    : r.message;
            return `🆔 \`${r.id}\`
📅 ${dateStr} 📢 <#${r.channelId}>
　📝 ${msgPreview}`;
        })
        .join("\n\n");

    return `${header}\n${list}\n\u200B`;
}

/**
 * 一覧のEmbedを生成する
 *
 * @param reminders - 表示するリマインダー
 * @param state - ページネーション状態
 * @param totalPages - 合計ページ数
 * @returns EmbedBuilder
 */
export function buildListEmbed(
    reminders: ReminderData[],
    state: ListState,
    totalPages: number,
): EmbedBuilder {
    const orderLabel = state.order === "asc" ? "⬆️ 昇順" : "⬇️ 降順";

    if (reminders.length === 0) {
        return new EmbedBuilder()
            .setColor(REMIND_COLOR_INFO)
            .setTitle(`📋 リマインダー一覧 (${state.page + 1}/${totalPages})`)
            .setDescription("📭 リマインダーはありません。");
    }

    const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

    const embed = new EmbedBuilder()
        .setColor(REMIND_COLOR_INFO)
        .setTitle(`📋 リマインダー一覧 (${state.page + 1}/${totalPages})`)
        .setDescription(`ソート順: ${orderLabel}`);

    reminders.forEach((r, index) => {
        const remindAt = new Date(r.remindAt);
        const unixTime = Math.floor(remindAt.getTime() / 1000);
        // メッセージプレビューはEmbedのフィールド値制限(1024文字)内なら全部出してもいいが、
        // 一覧性のためある程度で切るか、全文出すかはバランス次第。
        // ここでは従来のリスト形式を踏襲し、やや短めにしつつフォーマットを整える。
        const msgPreview =
            r.message.length > 50
                ? `${r.message.substring(0, 50)}...`
                : r.message;

        const emoji = NUMBER_EMOJIS[index] || `#${index + 1}`;

        embed.addFields({
            name: `\u200B\n${emoji} \`${r.id}\``,
            value: `📅 <t:${unixTime}:S> 📢 <#${r.channelId}>\n📝 ${msgPreview}`,
            inline: false,
        });
    });

    return embed;
}

/**
 * リマインダー選択用の Select Menu を生成する
 *
 * @param reminders - 表示するリマインダー
 * @param state - ページネーション状態
 * @returns Select Menu の ActionRow
 */
export function buildSelectMenu(
    reminders: ReminderData[],
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

        const emoji = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"][index] || `#${index + 1}`;

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
 *
 * @param state - ページネーション状態
 * @param selectedId - 選択されたリマインダーID（オプション）
 * @returns ボタンの ActionRow
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
 *
 * @param state - ページネーション状態
 * @param totalPages - 合計ページ数
 * @returns ボタンの ActionRow
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
