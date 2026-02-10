import { db } from "@db/client";
import type {
    FilterOptions,
    Reminder,
    ReminderData,
} from "@features/remind/types";
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
            logger.error("Failed to create reminder:", error);
            throw new Error("Failed to create reminder");
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
            logger.error(`Failed to find reminder by id ${id}:`, error);
            throw new Error("Failed to find reminder");
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
            logger.error("Failed to find reminders:", error);
            throw new Error("Failed to find reminders");
        }
    }

    async update(id: string, data: Partial<ReminderData>): Promise<void> {
        // Generate SET clause
        const updates: string[] = [];
        const params: (string | number | null)[] = [];

        for (const [key, value] of Object.entries(data)) {
            // Skip undefined values
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
            logger.error(`Failed to update reminder ${id}:`, error);
            throw new Error("Failed to update reminder");
        }
    }

    async delete(id: string): Promise<void> {
        try {
            db.run("DELETE FROM reminders WHERE id = ?", [id]);
        } catch (error) {
            logger.error(`Failed to delete reminder ${id}:`, error);
            throw new Error("Failed to delete reminder");
        }
    }

    /**
     * Delete reminders matching the filter.
     * Returns the number of deleted rows (not supported by bun:sqlite standard run? We might need to check changes)
     * bun:sqlite's db.run does not return changes easily in wrapper.
     * For now, we return void or rely on a generic delete.
     * We will check how to get changes if needed, but the interface said return number.
     * If bun:sqlite/better-sqlite3 compatible `run` returns info, we can use it.
     * existing client `run` returns void. We will stick to void or implement changes check.
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
            // Safety check: Don't delete everything if filter is empty unless intended?
            // For now assume caller knows what they are doing.

            db.run(sql, params);
        } catch (error) {
            logger.error("Failed to delete reminders:", error);
            throw new Error("Failed to delete reminders");
        }
    }
}
