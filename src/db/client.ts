import { Database as SQLite } from "bun:sqlite";
import { DB_FILE_PATH } from "../constants";
import { logger } from "../utils/logger";

/**
 * リマインダーのスキーマ定義
 */
export interface ReminderRow {
    id: string;
    channelId: string;
    message: string;
    remindAt: number; // Unix Timestamp (ms)
    createdAt: number; // Unix Timestamp (ms)
    createdBy: string;
    guildId: string;
}

export class Database {
    private db: SQLite;

    constructor() {
        this.db = new SQLite(DB_FILE_PATH);
        this.init();
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
                guildId TEXT NOT NULL
            );
        `);
        // インデックス作成（検索高速化）
        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_remindAt ON reminders(remindAt);
        `);
    }

    /**
     * クエリ実行 (SELECT)
     */
    query<T = unknown>(sql: string, params: (string | number | boolean | null)[] = []): T[] {
        return this.db.query(sql).all(...params) as T[];
    }

    /**
     * クエリ実行 (単一行取得)
     */
    get<T = unknown>(sql: string, params: (string | number | boolean | null)[] = []): T | null {
        return this.db.query(sql).get(...params) as T | null;
    }

    /**
     * コマンド実行 (INSERT, UPDATE, DELETE)
     */
    run(sql: string, params: (string | number | boolean | null)[] = []) {
        this.db.run(sql, params);
    }

    /**
     * プリペアドステートメント用
     */
    prepare(sql: string) {
        return this.db.prepare(sql);
    }
}

// シングルトン
export const db = new Database();
