import { db } from "@db/client";
import { ConcurrencyError, DatabaseError } from "@db/errors";
import type { FilterOptions, Reminder, ReminderData } from "@db/types";
import { logger } from "@utils/logger";
import { v4 as uuidv4 } from "uuid";

export class ReminderRepository {
    async create(
        data: ReminderData & { id?: string; createdAt?: number },
    ): Promise<Reminder> {
        const id = data.id || uuidv4();
        const now = Date.now();
        const createdAt = data.createdAt || now;
        const reminder: Reminder = {
            id,
            createdAt,
            ...data,
            replyMessageId: data.replyMessageId ?? null,
            replyChannelId: data.replyChannelId ?? null,
            version: 0,
        };

        try {
            db.run(
                `INSERT INTO reminders (
                    id, channelId, message, remindAt, createdAt, createdBy, guildId, replyMessageId, replyChannelId, version
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    reminder.id,
                    reminder.channelId,
                    reminder.message,
                    reminder.remindAt,
                    reminder.createdAt,
                    reminder.createdBy,
                    reminder.guildId,
                    reminder.replyMessageId ?? null,
                    reminder.replyChannelId ?? null,
                    reminder.version,
                ],
            );
            return reminder;
        } catch (error) {
            logger.error("❌ リマインダーの作成に失敗:", error);
            throw new DatabaseError("リマインダーの作成に失敗しました", error);
        }
    }

    async findById(id: string): Promise<Reminder | null> {
        try {
            const row = db.get<Reminder>(
                "SELECT * FROM reminders WHERE id = ?",
                [id],
            );
            return row;
        } catch (error) {
            // DB操作自体が失敗した場合（レコードが見つからない場合は正常に null を返す）
            logger.error(`❌ リマインダーの検索に失敗 (id=${id}):`, error);
            throw new DatabaseError("リマインダーの検索に失敗しました", error);
        }
    }

    async findAll(filter: FilterOptions = {}): Promise<Reminder[]> {
        try {
            let sql = "SELECT * FROM reminders WHERE 1=1";
            const params: (string | number)[] = [];

            if (filter.channelId) {
                sql += " AND channelId = ?";
                params.push(filter.channelId);
            }
            if (filter.guildId) {
                sql += " AND guildId = ?";
                params.push(filter.guildId);
            }
            if (filter.minRemindAt) {
                sql += " AND remindAt >= ?";
                params.push(filter.minRemindAt);
            }
            if (filter.maxRemindAt) {
                sql += " AND remindAt <= ?";
                params.push(filter.maxRemindAt);
            }

            sql += " ORDER BY remindAt ASC";

            return db.query<Reminder>(sql, params);
        } catch (error) {
            logger.error("❌ リマインダー一覧の取得に失敗:", error);
            throw new DatabaseError(
                "リマインダー一覧の取得に失敗しました",
                error,
            );
        }
    }

    async update(
        id: string,
        data: Partial<ReminderData>,
    ): Promise<Reminder | null> {
        // 更新前のデータを取得
        const existing = await this.findById(id);
        if (!existing) return null;

        const updates: string[] = [];
        const params: (string | number | null)[] = [];

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                updates.push(`${key} = ?`);
                params.push(value);
            }
        }

        // 更新がない場合は既存のデータを返す
        if (updates.length === 0) return existing;

        // version を自動インクリメント（楽観的ロック）
        updates.push("version = version + 1");

        // WHERE 句で現在の version を確認
        params.push(id);
        params.push(existing.version);

        const sql = `UPDATE reminders SET ${updates.join(", ")} WHERE id = ? AND version = ?`;

        try {
            const result = db.run(sql, params);

            // 更新行数が 0 の場合は version が一致しない = 他のリクエストが更新済み
            if (result.changes === 0) {
                throw new ConcurrencyError(
                    "リマインダーが他のユーザーによって更新されました。最新のデータを取得してください。",
                );
            }

            // undefined の値を除外してから更新後のオブジェクトを構築
            const cleanedData: Partial<ReminderData> = {};
            for (const [key, value] of Object.entries(data)) {
                if (value !== undefined) {
                    cleanedData[key as keyof ReminderData] = value as never;
                }
            }

            // 更新後のオブジェクトを構築して返す（DB再取得を回避）
            return {
                ...existing,
                ...cleanedData,
                version: existing.version + 1,
            };
        } catch (error) {
            // ConcurrencyError はそのまま再スロー
            if (error instanceof ConcurrencyError) {
                throw error;
            }
            logger.error(`❌ リマインダーの更新に失敗 (id=${id}):`, error);
            throw new DatabaseError("リマインダーの更新に失敗しました", error);
        }
    }

    async delete(id: string): Promise<void> {
        try {
            db.run("DELETE FROM reminders WHERE id = ?", [id]);
        } catch (error) {
            logger.error(`❌ リマインダーの削除に失敗 (id=${id}):`, error);
            throw new DatabaseError("リマインダーの削除に失敗しました", error);
        }
    }

    /**
     * フィルタ条件に一致するリマインダーを一括削除する
     *
     * @remarks bun:sqlite の run() は削除件数を返さないため、戻り値は void
     */
    async deleteMany(filter: FilterOptions): Promise<void> {
        try {
            let sql = "DELETE FROM reminders WHERE 1=1";
            const params: (string | number)[] = [];

            if (filter.channelId) {
                sql += " AND channelId = ?";
                params.push(filter.channelId);
            }
            if (filter.guildId) {
                sql += " AND guildId = ?";
                params.push(filter.guildId);
            }

            db.run(sql, params);
        } catch (error) {
            logger.error("❌ リマインダーの一括削除に失敗:", error);
            throw new DatabaseError(
                "リマインダーの一括削除に失敗しました",
                error,
            );
        }
    }
}
