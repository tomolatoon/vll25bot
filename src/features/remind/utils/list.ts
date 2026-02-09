import { logger } from "../../../utils/logger";
import {
    LIST_NAV_NEXT_PREFIX,
    LIST_NAV_PREV_PREFIX,
    LIST_ORDER_PREFIX,
    LIST_PREFIXES,
} from "../constants";
import type { Reminder } from "../types";

export const REMINDERS_PER_PAGE = 5;

export type SortOrder = "asc" | "desc";

export interface ListState {
    page: number;
    order: SortOrder;
    channelId?: string;
    userId?: string;
    guildId: string;
}

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

export function filterAndSortReminders(
    reminders: Reminder[],
    state: ListState,
): Reminder[] {
    let filtered = reminders;

    if (state.channelId) {
        filtered = filtered.filter((r) => r.channelId === state.channelId);
    }

    if (state.userId) {
        filtered = filtered.filter((r) => r.createdBy === state.userId);
    }

    filtered.sort((a, b) => {
        const dateA = new Date(a.remindAt).getTime();
        const dateB = new Date(b.remindAt).getTime();
        return state.order === "asc" ? dateA - dateB : dateB - dateA;
    });

    return filtered;
}

export function getTotalPages(totalItems: number): number {
    return Math.max(1, Math.ceil(totalItems / REMINDERS_PER_PAGE));
}

export function getPageItems(reminders: Reminder[], page: number): Reminder[] {
    const start = page * REMINDERS_PER_PAGE;
    return reminders.slice(start, start + REMINDERS_PER_PAGE);
}

/**
 * 現在の状態とcustomId（アクション）から次の状態を計算する
 */
export function getNextState(
    currentState: ListState,
    customId: string,
): ListState {
    const nextState = { ...currentState };
    const prefix = customId.split(":")[0];

    // customIdに含まれるアクションキーワードに基づいて次の状態を決定する
    if (prefix === LIST_NAV_PREV_PREFIX) {
        nextState.page = Math.max(0, nextState.page - 1);
    } else if (prefix === LIST_NAV_NEXT_PREFIX) {
        nextState.page++;
    } else if (prefix === LIST_ORDER_PREFIX) {
        nextState.order = nextState.order === "asc" ? "desc" : "asc";
    } else if (!Object.hasOwn(LIST_PREFIXES, prefix)) {
        logger.warn(
            `⚠️ getNextState: 不明なリストの操作です: customId=${customId}`,
        );
    }

    return nextState;
}
