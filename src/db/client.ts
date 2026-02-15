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
                replyChannelId TEXT,
                version INTEGER NOT NULL DEFAULT 0
            );
        `);
        // インデックス作成（検索高速化）
        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_remindAt ON reminders(remindAt);
        `);

        // マイグレーション: 既存テーブルに新しいカラムを追加
        this.migrateAddReplyMessageColumns();
        this.migrateAddVersionColumn();
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
                    "🔄 マイグレーション: replyMessageId, replyChannelId カラムを追加中...",
                );
                this.db.run(
                    "ALTER TABLE reminders ADD COLUMN replyMessageId TEXT",
                );
                this.db.run(
                    "ALTER TABLE reminders ADD COLUMN replyChannelId TEXT",
                );
                logger.info("✅ マイグレーション完了");
            }
        } catch (error) {
            logger.error("❌ マイグレーション失敗:", error);
        }
    }

    private migrateAddVersionColumn() {
        try {
            const tableInfo = this.db
                .query("PRAGMA table_info(reminders)")
                .all() as Array<{
                name: string;
            }>;
            const hasVersion = tableInfo.some((col) => col.name === "version");

            if (!hasVersion) {
                logger.info("🔄 マイグレーション: version カラムを追加中...");
                this.db.run(
                    "ALTER TABLE reminders ADD COLUMN version INTEGER NOT NULL DEFAULT 0",
                );
                logger.info("✅ マイグレーション完了");
            }
        } catch (error) {
            logger.error("❌ version カラムのマイグレーション失敗:", error);
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

    run(sql: string, params: (string | number | boolean | null)[] = []): {
        changes: number;
        lastInsertRowid: number | bigint;
    } {
        const stmt = this.db.prepare(sql);
        const result = stmt.run(...params);
        return {
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid,
        };
    }

    /**
     * トランザクション内で複数のDB操作を実行する
     * @param fn - トランザクション内で実行する関数
     * @returns 関数の戻り値
     * @throws トランザクション内でエラーが発生した場合、ロールバックして例外をスロー
     */
    public transaction<T>(fn: () => T): T {
        return this.db.transaction(fn)();
    }
}

// シングルトン
export const db = DatabaseClient.getInstance();
