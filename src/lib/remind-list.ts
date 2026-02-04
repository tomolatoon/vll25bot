/**
 * remind-list.ts - リマインダー一覧表示のユーティリティ
 *
 * ページネーション、Select Menu、ナビゲーションボタンの生成を担当
 */

import type { ReminderData } from "../reminder";

/** 1ページあたりの表示件数 */
export const REMINDERS_PER_PAGE = 5;

/** ソート順 */
export type SortOrder = "asc" | "desc";

/** ページネーション状態 */
export interface ListState {
    /** 現在のページ（0始まり） */
    page: number;
    /** ソート順 */
    order: SortOrder;
    /** フィルター: チャンネルID（省略で全チャンネル） */
    channelId?: string;
    /** フィルター: ユーザーID（省略で自分のみ） */
    userId?: string;
    /** ギルドID */
    guildId: string;
}

/**
 * 状態をカスタムIDにエンコードする
 *
 * @param prefix - IDプレフィックス
 * @param state - ページネーション状態
 * @param selectedId - 選択されたリマインダーID（オプション）
 * @returns エンコードされたカスタムID
 *
 * @remarks
 * フォーマット: `{prefix}:{page}:{order}:{selectedId}`
 * selectedId が無い場合は省略
 * Discord の customId は 100 文字制限があるため、guildId/userId/channelId は含めない
 */
export function encodeState(
    prefix: string,
    state: ListState,
    selectedId?: string,
): string {
    if (selectedId) {
        return `${prefix}:${state.page}:${state.order}:${selectedId}`;
    }
    return `${prefix}:${state.page}:${state.order}`;
}

/**
 * カスタムIDから状態をデコードする
 *
 * @param customId - デコードするカスタムID
 * @param guildId - ギルドID（interaction から取得）
 * @param defaultUserId - デフォルトのユーザーID（interaction.user.id）
 * @param defaultChannelId - デフォルトのチャンネルID（オプション）
 * @returns デコードされた状態とリマインダーID
 */
export function decodeState(
    customId: string,
    guildId: string,
    defaultUserId?: string,
    defaultChannelId?: string,
): {
    prefix: string;
    state: ListState;
    selectedId?: string;
} {
    const parts = customId.split(":");
    return {
        prefix: parts[0],
        state: {
            page: Number.parseInt(parts[1], 10),
            order: parts[2] as SortOrder,
            channelId: defaultChannelId,
            userId: defaultUserId,
            guildId,
        },
        selectedId: parts[3],
    };
}

/**
 * リマインダーをフィルター・ソートする
 *
 * @param reminders - 全リマインダー
 * @param state - フィルター・ソート条件
 * @returns フィルター・ソート済みのリマインダー
 */
export function filterAndSortReminders(
    reminders: ReminderData[],
    state: ListState,
): ReminderData[] {
    let filtered = reminders;

    // チャンネルでフィルター
    if (state.channelId) {
        filtered = filtered.filter((r) => r.channelId === state.channelId);
    }

    // ユーザーでフィルター
    if (state.userId) {
        filtered = filtered.filter((r) => r.createdBy === state.userId);
    }

    // 日時でソート
    filtered.sort((a, b) => {
        const dateA = new Date(a.remindAt).getTime();
        const dateB = new Date(b.remindAt).getTime();
        return state.order === "asc" ? dateA - dateB : dateB - dateA;
    });

    return filtered;
}

/**
 * ページ数を計算する
 *
 * @param totalItems - 合計アイテム数
 * @returns ページ数
 */
export function getTotalPages(totalItems: number): number {
    return Math.max(1, Math.ceil(totalItems / REMINDERS_PER_PAGE));
}

/**
 * 現在のページのリマインダーを取得する
 *
 * @param reminders - 全リマインダー（フィルター・ソート済み）
 * @param page - ページ番号（0始まり）
 * @returns 現在のページのリマインダー
 */
export function getPageItems(
    reminders: ReminderData[],
    page: number,
): ReminderData[] {
    const start = page * REMINDERS_PER_PAGE;
    return reminders.slice(start, start + REMINDERS_PER_PAGE);
}
