import { db } from "@db/client";
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
        };

        try {
            db.run(
                `INSERT INTO reminders (
                    id, channelId, message, remindAt, createdAt, createdBy, guildId, replyMessageId, replyChannelId
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                ],
            );
            return reminder;
        } catch (error) {
            logger.error("❌ リマインダーの作成に失敗:", error);
            throw new Error("リマインダーの作成に失敗しました");
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
            logger.error(`❌ リマインダーの検索に失敗 (id=${id}):`, error);
            throw new Error("リマインダーの検索に失敗しました");
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
            throw new Error("リマインダー一覧の取得に失敗しました");
        }
    }

    async update(id: string, data: Partial<ReminderData>): Promise<void> {
        const updates: string[] = [];
        const params: (string | number | null)[] = [];

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                updates.push(`${key} = ?`);
                params.push(value);
            }
        }

        if (updates.length === 0) return;

        params.push(id);
        const sql = `UPDATE reminders SET ${updates.join(", ")} WHERE id = ?`;

        try {
            db.run(sql, params);
        } catch (error) {
            logger.error(`❌ リマインダーの更新に失敗 (id=${id}):`, error);
            throw new Error("リマインダーの更新に失敗しました");
        }
    }

    async delete(id: string): Promise<void> {
        try {
            db.run("DELETE FROM reminders WHERE id = ?", [id]);
        } catch (error) {
            logger.error(`❌ リマインダーの削除に失敗 (id=${id}):`, error);
            throw new Error("リマインダーの削除に失敗しました");
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
            throw new Error("リマインダーの一括削除に失敗しました");
        }
    }
}
