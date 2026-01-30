/**
 * reminder.ts - リマインダー管理 (SQLite版)
 */

import { existsSync, readFileSync, renameSync } from "node:fs";
import type { Client, TextChannel } from "discord.js";
import { v7 as uuidv7 } from "uuid";
import { REMINDER_FILE_PATH } from "./constants";
import { db, type ReminderRow } from "./db/client";
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
}

class Reminder {
    private client: Client | null = null;
    private checkInterval: Timer | null = null;

    constructor() {
        // 1分ごとにチェック
        this.startScheduler();
    }

    setClient(client: Client): void {
        this.client = client;
    }

    /** ポーリング開始 */
    private startScheduler() {
        if (this.checkInterval) clearInterval(this.checkInterval);
        
        // 毎分00秒に合わせるとなお良いが、簡易的に1分間隔で実行
        this.checkInterval = setInterval(() => {
            this.checkReminders();
        }, 60 * 1000);
        
        // 起動時に一度チェック（遅延実行を防ぐため）
        setTimeout(() => this.checkReminders(), 5000);
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
                [id, channelId, message, remindAtTimestamp, createdAt, createdBy, guildId]
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
            return data;
        } catch (error) {
            logger.error("❌ リマインダー登録失敗:", error);
            return null;
        }
    }

    /** リマインダーを削除 */
    stop(id: string): boolean {
        try {
            const exists = db.get<{ id: string }>("SELECT id FROM reminders WHERE id = ?", [id]);
            if (!exists) return false;

            db.run("DELETE FROM reminders WHERE id = ?", [id]);
            logger.info(`🗑️ リマインダー削除: ${id}`);
            return true;
        } catch (error) {
            logger.error("❌ リマインダー削除失敗:", error);
            return false;
        }
    }

    /** 期限切れリマインダーのチェックと実行 */
    private async checkReminders() {
        if (!this.client) return;

        // 現在時刻 + 1分 以下の未実行リマインダーを取得
        // (例: 12:00:00実行時、12:01:00までのものを取得 -> 12:00:30のものも含まれる)
        const now = Date.now();
        const threshold = now + 60 * 1000;

        try {
            const tasks = db.query<ReminderRow>(
                "SELECT * FROM reminders WHERE remindAt <= ? ORDER BY remindAt ASC",
                [threshold]
            );

            if (tasks.length === 0) return;

            logger.info(`🔄 ${tasks.length}件のリマインダーを実行します`);

            for (const task of tasks) {
                await this.execute(task);
            }
        } catch (error) {
            logger.error("❌ リマインダーチェック中にエラー発生:", error);
        }
    }

    /** メッセージを送信 */
    private async execute(row: ReminderRow): Promise<void> {
        if (!this.client) {
            logger.error("❌ Discord クライアントが未設定");
            return;
        }

        try {
            const channel = (await this.client.channels.fetch(
                row.channelId,
            )) as TextChannel | null;

            if (channel) {
                await channel.send(row.message);
                logger.info(`📤 送信完了: ${row.id} -> #${channel.name}`);
            } else {
                logger.error(`❌ チャンネル未発見: ${row.channelId}`);
            }
        } catch (error) {
            logger.error(`❌ 送信エラー (${row.id}):`, error);
        } finally {
            // 送信成功/失敗に関わらず削除（再送防止）
            this.stop(row.id);
        }
    }

    /** 全リマインダー一覧を取得 (互換性のためDateObjectではなくRequestData形式で返す) */
    getAll(): ReminderData[] {
        return db.query<ReminderRow>("SELECT * FROM reminders ORDER BY remindAt ASC")
            .map(this.rowToData);
    }

    /** ギルドのリマインダー一覧を取得 */
    getByGuild(guildId: string): ReminderData[] {
        return db.query<ReminderRow>(
            "SELECT * FROM reminders WHERE guildId = ? ORDER BY remindAt ASC", 
            [guildId]
        ).map(this.rowToData);
    }

    /** IDでリマインダーを検索 */
    findById(id: string): ReminderData | undefined {
        const row = db.get<ReminderRow>("SELECT * FROM reminders WHERE id = ?", [id]);
        return row ? this.rowToData(row) : undefined;
    }

    /** JSONファイルからの移行 */
    restore(): number {
        if (!existsSync(REMINDER_FILE_PATH)) {
            return 0;
        }

        logger.info("📂 旧データファイル(reminders.json)を検出。データベース移行を開始します...");

        try {
            const content = readFileSync(REMINDER_FILE_PATH, "utf-8");
            const oldData: ReminderData[] = JSON.parse(content);
            let count = 0;

            const stmt = db.prepare(
                `INSERT OR IGNORE INTO reminders (id, channelId, message, remindAt, createdAt, createdBy, guildId)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
            );

            const now = Date.now();

            db.run("BEGIN TRANSACTION");
            for (const item of oldData) {
                // 過去のものはスキップ（あるいは移行して即時実行されるかも? 今回はスキップロジックを入れる）
                const remindAtDate = new Date(item.remindAt);
                if (remindAtDate.getTime() <= now) {
                    logger.info(`⏭️ 過去のリマインダーのため移行スキップ: ${item.id}`);
                    continue;
                }

                stmt.run(
                    item.id,
                    item.channelId,
                    item.message,
                    remindAtDate.getTime(),
                    now, // createdAtは不明なので現在時刻
                    item.createdBy,
                    item.guildId
                );
                count++;
            }
            db.run("COMMIT");

            logger.info(`✅ ${count}/${oldData.length}件のデータを移行しました。`);

            // 移行完了後リネーム
            const migratedPath = REMINDER_FILE_PATH + ".migrated";
            renameSync(REMINDER_FILE_PATH, migratedPath);
            logger.info(`📂 旧ファイルをリネームしました: ${migratedPath}`);

            return count;
        } catch (error) {
            logger.error("❌ データ移行中にエラーが発生しました:", error);
            if (db.query("SELECT 1").get(null)) db.run("ROLLBACK");
            return 0;
        }
    }

    /** 全タスクを停止（DB全削除）- 慎重に */
    stopAll(): void {
        db.run("DELETE FROM reminders");
        logger.info("🛑 全リマインダーを削除しました");
    }

    /** ギルドの全タスクを停止 */
    stopAllByGuild(guildId: string): number {
        const count = db.get<{ctx: number}>("SELECT COUNT(*) as ctx FROM reminders WHERE guildId = ?", [guildId])?.ctx || 0;
        if (count > 0) {
            db.run("DELETE FROM reminders WHERE guildId = ?", [guildId]);
            logger.info(`🛑 ギルドの${count}件のリマインダーを削除しました`);
        }
        return count;
    }
    
    // 互換性用: 保存はDB即時反映なので何もしない
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

export const getReminders = () => reminder.getAll();
export const getReminderById = reminder.findById.bind(reminder);
export const getRemindersByGuild = reminder.getByGuild.bind(reminder);

export const stopReminder = reminder.stop.bind(reminder);
export const stopReminders = () => reminder.stopAll();
export const stopRemindersByGuild = reminder.stopAllByGuild.bind(reminder);

export const saveReminders = () => reminder.save();
export const restoreReminders = () => reminder.restore();
