/**
 * reminder.ts - リマインダー管理 (SQLite版)
 */

import { existsSync, readFileSync, renameSync } from "node:fs";
import type { Client, TextChannel } from "discord.js";
import { v7 as uuidv7 } from "uuid";
import { REMINDER_FILE_PATH } from "./constants";
import { type ReminderRow, db } from "./db/client";
import { logger } from "./utils/logger";

/** リマインダーデータ (外部公開用) */
export interface ReminderData {
    id: string;
    channelId: string;
    message: string;
    remindAt: string; // ISO 8601 string
    createdBy: string;
    guildId: string;
    createdAt?: string; // Optional for backward compatibility
    replyMessageId?: string; // リプライメッセージのID
    replyChannelId?: string; // リプライメッセージのチャンネルID
}

class Reminder {
    private client: Client | null = null;
    private checkInterval: ReturnType<typeof setInterval> | null = null;
    // メモリ内で待機中のタイマーを管理 (ID -> Timeout)
    private scheduledTasks = new Map<string, ReturnType<typeof setTimeout>>();

    constructor() {
        // 1分ごとにチェック (プリフェッチ)
        this.startScheduler();
    }

    setClient(client: Client): void {
        this.client = client;
        // クライアント設定時に既存のスケジュール済みタスクがあれば実行可能状態にする(現状はexecuteでチェックしているので不要だが明示的にリロードしても良い)
    }

    /** ポーリング開始 */
    private startScheduler() {
        if (this.checkInterval) clearInterval(this.checkInterval);

        // ほぼ1分おきにチェック
        this.checkInterval = setInterval(() => {
            this.checkReminders();
        }, 60 * 1000);

        // 起動時に直近のものをチェック
        setTimeout(() => this.checkReminders(), 1000);
    }

    /** リマインダーを作成して登録 */
    create(
        channelId: string,
        message: string,
        remindAt: Date,
        createdBy: string,
        guildId: string,
    ): ReminderData | null {
        if (remindAt <= new Date()) return null;

        const id = uuidv7();
        const createdAt = Date.now();
        const remindAtTimestamp = remindAt.getTime();

        try {
            db.run(
                `INSERT INTO reminders (id, channelId, message, remindAt, createdAt, createdBy, guildId)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    channelId,
                    message,
                    remindAtTimestamp,
                    createdAt,
                    createdBy,
                    guildId,
                ],
            );

            const data: ReminderData = {
                id,
                channelId,
                message,
                remindAt: remindAt.toISOString(),
                createdBy,
                guildId,
            };

            logger.info(
                `⏰ リマインダー登録: ${id} @ ${remindAt.toLocaleString("ja-JP")}`,
            );

            // 直近（次のポーリングまで）なら即時スケジュール
            // バッファを持たせて少し長めの期間でもメモリに載せておく (例: 70秒以内)
            const now = Date.now();
            if (remindAtTimestamp <= now + 70 * 1000) {
                this.scheduleTask(id, remindAtTimestamp, data);
            }

            return data;
        } catch (error) {
            logger.error("❌ リマインダー登録失敗:", error);
            return null;
        }
    }

    /** リマインダーを削除 */
    stop(id: string): boolean {
        try {
            // メモリ上のタイマーを解除
            if (this.scheduledTasks.has(id)) {
                clearTimeout(this.scheduledTasks.get(id));
                this.scheduledTasks.delete(id);
            }

            const exists = db.get<{ id: string }>(
                "SELECT id FROM reminders WHERE id = ?",
                [id],
            );
            if (!exists) return false;

            db.run("DELETE FROM reminders WHERE id = ?", [id]);
            logger.info(`🗑️ リマインダー削除: ${id}`);
            return true;
        } catch (error) {
            logger.error("❌ リマインダー削除失敗:", error);
            return false;
        }
    }

    /**
     * リマインダーを更新
     *
     * @param id リマインダーID
     * @param updates 更新する項目（message, remindAt, channelId）
     * @returns 更新後のリマインダーデータ、失敗時は null
     *
     * @事前条件 指定されたIDのリマインダーが存在すること
     * @事後条件 DBが更新され、新しい日時の場合はスケジュールが再設定される
     */
    update(
        id: string,
        updates: {
            message?: string;
            remindAt?: Date;
            channelId?: string;
            replyMessageId?: string;
            replyChannelId?: string;
        },
    ): ReminderData | null {
        try {
            const existing = db.get<ReminderRow>(
                "SELECT * FROM reminders WHERE id = ?",
                [id],
            );
            if (!existing) return null;

            // 更新項目の準備
            const newMessage = updates.message ?? existing.message;
            const newRemindAt = updates.remindAt?.getTime() ?? existing.remindAt;
            const newChannelId = updates.channelId ?? existing.channelId;
            const newReplyMessageId =
                updates.replyMessageId ?? existing.replyMessageId ?? null;
            const newReplyChannelId =
                updates.replyChannelId ?? existing.replyChannelId ?? null;

            // 過去の日時チェック
            if (updates.remindAt && newRemindAt <= Date.now()) {
                logger.error("❌ 過去の日時には更新できません");
                return null;
            }

            // DB更新
            db.run(
                `UPDATE reminders
                 SET message = ?, remindAt = ?, channelId = ?, replyMessageId = ?, replyChannelId = ?
                 WHERE id = ?`,
                [
                    newMessage,
                    newRemindAt,
                    newChannelId,
                    newReplyMessageId,
                    newReplyChannelId,
                    id,
                ],
            );

            // スケジュール済みタスクを再設定
            if (updates.remindAt && this.scheduledTasks.has(id)) {
                clearTimeout(this.scheduledTasks.get(id));
                this.scheduledTasks.delete(id);
            }

            const data: ReminderData = {
                id,
                channelId: newChannelId,
                message: newMessage,
                remindAt: new Date(newRemindAt).toISOString(),
                createdBy: existing.createdBy,
                guildId: existing.guildId,
                createdAt: new Date(existing.createdAt).toISOString(),
                replyMessageId: newReplyMessageId ?? undefined,
                replyChannelId: newReplyChannelId ?? undefined,
            };

            // 直近なら即時スケジュール
            if (updates.remindAt) {
                const now = Date.now();
                if (newRemindAt <= now + 70 * 1000) {
                    this.scheduleTask(id, newRemindAt, data);
                }
            }

            logger.info(
                `✏️ リマインダー更新: ${id} @ ${new Date(newRemindAt).toLocaleString("ja-JP")}`,
            );

            return data;
        } catch (error) {
            logger.error("❌ リマインダー更新失敗:", error);
            return null;
        }
    }

    /** 期限切れ & 直近のリマインダーをチェックして予約 */
    private async checkReminders() {
        // 現在時刻 + 1分 + バッファ(10秒) までのリマインダーを取得
        const now = Date.now();
        const threshold = now + 70 * 1000;

        try {
            const tasks = db.query<ReminderRow>(
                "SELECT * FROM reminders WHERE remindAt <= ? ORDER BY remindAt ASC",
                [threshold],
            );

            if (tasks.length === 0) return;

            let scheduledCount = 0;
            for (const row of tasks) {
                // すでにスケジュール済みならスキップ (重複防止)
                if (this.scheduledTasks.has(row.id)) continue;

                const data = this.rowToData(row);
                this.scheduleTask(row.id, row.remindAt, data);
                scheduledCount++;
            }

            if (scheduledCount > 0) {
                logger.info(
                    `🔄 ${scheduledCount}件のリマインダーをメモリに予約しました`,
                );
            }
        } catch (error) {
            logger.error("❌ リマインダーチェック中にエラー発生:", error);
        }
    }

    /** 指定時刻に実行するようにタイマーをセット */
    private scheduleTask(id: string, remindAt: number, data: ReminderData) {
        // 既存があれば消す（念のため）
        if (this.scheduledTasks.has(id)) {
            clearTimeout(this.scheduledTasks.get(id));
        }

        const now = Date.now();
        const delay = Math.max(0, remindAt - now);

        const timer = setTimeout(() => {
            this.scheduledTasks.delete(id);
            this.execute(data);
        }, delay);

        this.scheduledTasks.set(id, timer);
    }

    /** メッセージを送信 */
    private async execute(data: ReminderData): Promise<void> {
        if (!this.client) {
            logger.error("❌ Discord クライアントが未設定");
            // クライアントがない場合でも、DBからは削除しないと永遠に残る可能性があるが、
            // 重要データなので再試行の余地を残すため削除しない選択肢もある。
            // 今回は「送信失敗」としてログに書き、DBからは消さない（次のポーリングでまた拾われる -> また失敗ログが出る）
            // というループになるが、クライアント未設定は異常事態なのでそれで気づけるようにする。
            return;
        }

        try {
            const channel = (await this.client.channels.fetch(
                data.channelId,
            )) as TextChannel | null;

            if (channel) {
                await channel.send(data.message);
                logger.info(`📤 送信完了: ${data.id} -> #${channel.name}`);
            } else {
                logger.error(`❌ チャンネル未発見: ${data.channelId}`);
            }
        } catch (error) {
            logger.error(`❌ 送信エラー (${data.id}):`, error);
        }

        // 送信成功/失敗に関わらず(チャネル不明等は回復不能なので) 削除
        // クライアント未設定エラー以外のエラー（権限など）はここで削除される
        this.removeDbRecord(data.id);
    }

    /** DBからレコード削除（内部用） */
    private removeDbRecord(id: string) {
        try {
            db.run("DELETE FROM reminders WHERE id = ?", [id]);
        } catch (e) {
            logger.error(`❌ DB削除失敗 (${id}):`, e);
        }
    }

    /** 全リマインダー一覧を取得 (互換性のためDateObjectではなくRequestData形式で返す) */
    getAll(): ReminderData[] {
        return db
            .query<ReminderRow>("SELECT * FROM reminders ORDER BY remindAt ASC")
            .map(this.rowToData);
    }

    /** ギルドのリマインダー一覧を取得 */
    getByGuild(guildId: string): ReminderData[] {
        return db
            .query<ReminderRow>(
                "SELECT * FROM reminders WHERE guildId = ? ORDER BY remindAt ASC",
                [guildId],
            )
            .map(this.rowToData);
    }

    /** IDでリマインダーを検索 */
    findById(id: string): ReminderData | undefined {
        const row = db.get<ReminderRow>(
            "SELECT * FROM reminders WHERE id = ?",
            [id],
        );
        return row ? this.rowToData(row) : undefined;
    }

    /** JSONファイルからの移行 */
    restore(): number {
        if (!existsSync(REMINDER_FILE_PATH)) {
            return 0;
        }

        logger.info(
            "📂 旧データファイル(reminders.json)を検出。データベース移行を開始します...",
        );

        try {
            const content = readFileSync(REMINDER_FILE_PATH, "utf-8");
            const oldData = JSON.parse(content) as ReminderData[];
            let count = 0;

            const stmt = db.prepare(
                `INSERT OR IGNORE INTO reminders (id, channelId, message, remindAt, createdAt, createdBy, guildId)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
            );

            const now = Date.now();

            db.run("BEGIN TRANSACTION");
            for (const item of oldData) {
                const remindAtDate = new Date(item.remindAt);
                // 過去のものはスキップしない（ロジック変更：過去のものも取り込んで即時実行させる方が自然かもだが、
                // 大量に来ると困るので、明らかな過去(1分以上前)はスキップ、直近は取り込むなどの判断が必要。
                // 以前のロジックを踏襲し、完全に過去のものはスキップする)
                if (remindAtDate.getTime() <= now) {
                    logger.info(
                        `⏭️ 過去のリマインダーのため移行スキップ: ${item.id}`,
                    );
                    continue;
                }

                stmt.run(
                    item.id,
                    item.channelId,
                    item.message,
                    remindAtDate.getTime(),
                    now, // createdAtは不明なので現在時刻
                    item.createdBy,
                    item.guildId,
                );
                count++;
            }
            db.run("COMMIT");

            logger.info(
                `✅ ${count}/${oldData.length}件のデータを移行しました。`,
            );

            // 移行完了後リネーム
            const migratedPath = `${REMINDER_FILE_PATH}.migrated`;
            renameSync(REMINDER_FILE_PATH, migratedPath);
            logger.info(`📂 旧ファイルをリネームしました: ${migratedPath}`);

            // 移行したデータを即座にスケジュールチェック
            setTimeout(() => this.checkReminders(), 100);

            return count;
        } catch (error) {
            logger.error("❌ データ移行中にエラーが発生しました:", error);
            if (db.get("SELECT 1")) db.run("ROLLBACK");
            return 0;
        }
    }

    /** 全タスクを停止（DB全削除）- 慎重に */
    stopAll(): void {
        db.run("DELETE FROM reminders");
        // メモリもクリア
        for (const timer of this.scheduledTasks.values()) {
            clearTimeout(timer);
        }
        this.scheduledTasks.clear();
        logger.info("🛑 全リマインダーを削除しました");
    }

    /** ギルドの全タスクを停止 */
    stopAllByGuild(guildId: string): number {
        const targets = this.getByGuild(guildId);

        // メモリ上のタイマー解除
        for (const target of targets) {
            if (this.scheduledTasks.has(target.id)) {
                clearTimeout(this.scheduledTasks.get(target.id));
                this.scheduledTasks.delete(target.id);
            }
        }

        const count =
            db.get<{ ctx: number }>(
                "SELECT COUNT(*) as ctx FROM reminders WHERE guildId = ?",
                [guildId],
            )?.ctx || 0;
        if (count > 0) {
            db.run("DELETE FROM reminders WHERE guildId = ?", [guildId]);
            logger.info(`🛑 ギルドの${count}件のリマインダーを削除しました`);
        }
        return count;
    }

    // 互換性用
    save(): void {
        // No-op
    }

    /** DB行データをReminderDataに変換 */
    private rowToData(row: ReminderRow): ReminderData {
        return {
            id: row.id,
            channelId: row.channelId,
            message: row.message,
            remindAt: new Date(row.remindAt).toISOString(),
            createdBy: row.createdBy,
            guildId: row.guildId,
            createdAt: new Date(row.createdAt).toISOString(),
        };
    }
}

// シングルトンインスタンス
const reminder = new Reminder();

// 外部公開用の関数
export const setClient = (client: Client) => reminder.setClient(client);
export const createReminder = reminder.create.bind(reminder);
export const updateReminder = reminder.update.bind(reminder);

export const getReminders = () => reminder.getAll();
export const getReminderById = reminder.findById.bind(reminder);
export const getRemindersByGuild = reminder.getByGuild.bind(reminder);

export const stopReminder = reminder.stop.bind(reminder);
export const stopReminders = () => reminder.stopAll();
export const stopRemindersByGuild = reminder.stopAllByGuild.bind(reminder);

export const saveReminders = () => reminder.save();
export const restoreReminders = () => reminder.restore();
