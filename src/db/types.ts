/**
 * DB層の型定義
 *
 * データベースに関連する型はここに定義する。
 * Features層から再エクスポートして後方互換を維持すること。
 */

/** リマインダーのデータモデル */
export interface Reminder {
    id: string;
    channelId: string;
    message: string;
    /** Unixタイムスタンプ (ミリ秒) */
    remindAt: number;
    /** Unixタイムスタンプ (ミリ秒) */
    createdAt: number;
    createdBy: string;
    guildId: string;
    replyMessageId?: string | null;
    replyChannelId?: string | null;
    /** 楽観的ロック用バージョン番号 */
    version: number;
}

/** リマインダー作成時のデータ（id, createdAt は自動生成） */
export type ReminderData = Omit<Reminder, "id" | "createdAt">;

/** リマインダー検索フィルター */
export interface FilterOptions {
    channelId?: string;
    guildId?: string;
    minRemindAt?: number;
    maxRemindAt?: number;
}
