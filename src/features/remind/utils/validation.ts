import type { Reminder } from "@db/types";
import { parseFutureDateTime } from "@lib/parser/date-parser";
import { reminderService } from "../services/reminder-service"; // シングルトンインスタンス

export type ValidationResult =
    | { success: true; reminder: Reminder }
    | { success: false; error: string };

export type DateTimeValidationResult =
    | { success: true; date: Date | undefined }
    | { success: false; error: string };

/**
 * 更新用のリマインダー検証（所有権確認など）
 */
export async function validateReminderForUpdate(
    id: string,
    userId: string,
    guildId?: string,
): Promise<ValidationResult> {
    const reminder = await reminderService.getReminderById(id);

    if (!reminder) {
        return { success: false, error: "リマインダーが見つかりません。" };
    }

    if (reminder.createdBy !== userId) {
        return {
            success: false,
            error: "自分が登録したリマインダーのみ編集できます。",
        };
    }

    if (guildId && reminder.guildId !== guildId) {
        return {
            success: false,
            error: "このサーバーのリマインダーではありません。",
        };
    }

    return { success: true, reminder };
}

/**
 * 日時入力文字列の検証
 */
export function validateDateTimeInput(
    datetimeStr: string | undefined,
): DateTimeValidationResult {
    if (!datetimeStr) {
        return { success: true, date: undefined };
    }

    const parsedDate = parseFutureDateTime(datetimeStr);
    if (!parsedDate) {
        return {
            success: false,
            error: "日時の形式を正しく入力してください。\n例: 2026/01/15 9:00, 明日 9:00, 1分後 など",
        };
    }

    if (parsedDate <= new Date()) {
        return { success: false, error: "未来の日時を指定してください。" };
    }

    return { success: true, date: parsedDate };
}

/**
 * UI表示用の変更内容リストを生成
 */
export function buildChangesArray(updates: {
    message?: string;
    remindAt?: Date;
    channelId?: string;
}): string[] {
    const changes: string[] = [];

    if (updates.message) {
        changes.push(`📝 メッセージ: ${updates.message}`);
    }

    if (updates.remindAt) {
        changes.push(`📅 日時: ${updates.remindAt.toLocaleString("ja-JP")}`);
    }

    if (updates.channelId) {
        changes.push(`📢 チャンネル: <#${updates.channelId}>`);
    }

    return changes;
}
