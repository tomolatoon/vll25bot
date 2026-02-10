import { Database as SQLite } from "bun:sqlite";
import { DB_FILE_PATH } from "@/constants";
import { logger } from "@utils/logger";

export class DatabaseClient {
    private db: SQLite;
    private static instance: DatabaseClient;

    private constructor() {
        this.db = new SQLite(DB_FILE_PATH);
        this.init();
    }

    public static getInstance(): DatabaseClient {
        if (!DatabaseClient.instance) {
            DatabaseClient.instance = new DatabaseClient();
        }
        return DatabaseClient.instance;
    }

    private init() {
        // テーブル作成
        this.db.run(`
            CREATE TABLE IF NOT EXISTS reminders (
                id TEXT PRIMARY KEY,
                channelId TEXT NOT NULL,
                message TEXT NOT NULL,
                remindAt INTEGER NOT NULL,
                createdAt INTEGER NOT NULL,
                createdBy TEXT NOT NULL,
                guildId TEXT NOT NULL,
                replyMessageId TEXT,
                replyChannelId TEXT
            );
        `);
        // インデックス作成（検索高速化）
        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_remindAt ON reminders(remindAt);
        `);

        // マイグレーション: 既存テーブルに新しいカラムを追加
        this.migrateAddReplyMessageColumns();
    }

    private migrateAddReplyMessageColumns() {
        try {
            const tableInfo = this.db
                .query("PRAGMA table_info(reminders)")
                .all() as Array<{
                name: string;
            }>;
            const hasReplyMessageId = tableInfo.some(
                (col) => col.name === "replyMessageId",
            );

            if (!hasReplyMessageId) {
                logger.info(
                    "🔄 Migration: Adding replyMessageId, replyChannelId columns...",
                );
                this.db.run(
                    "ALTER TABLE reminders ADD COLUMN replyMessageId TEXT",
                );
                this.db.run(
                    "ALTER TABLE reminders ADD COLUMN replyChannelId TEXT",
                );
                logger.info("✅ Migration complete");
            }
        } catch (error) {
            logger.error("❌ Migration failed:", error);
        }
    }

    query<T = unknown>(
        sql: string,
        params: (string | number | boolean | null)[] = [],
    ): T[] {
        return this.db.query(sql).all(...params) as T[];
    }

    get<T = unknown>(
        sql: string,
        params: (string | number | boolean | null)[] = [],
    ): T | null {
        return this.db.query(sql).get(...params) as T | null;
    }

    run(sql: string, params: (string | number | boolean | null)[] = []) {
        this.db.run(sql, params);
    }
}

// Singleton export
export const db = DatabaseClient.getInstance();
