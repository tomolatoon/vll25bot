import path from "node:path";

/**
 * アプリケーション定数定義
 */

// データ保存ディレクトリ (プロジェクトルート)
export const DATA_DIR = process.cwd();

// リマインダーファイル名
export const REMINDER_FILE_NAME = "reminders.json";
export const REMINDER_BACKUP_FILE_NAME = "reminders_bkp.json";

// リマインダーファイルのフルパス
export const REMINDER_FILE_PATH = path.join(DATA_DIR, REMINDER_FILE_NAME);
export const REMINDER_BACKUP_FILE_PATH = path.join(
    DATA_DIR,
    REMINDER_BACKUP_FILE_NAME,
);

// データベースファイル名
export const DB_FILE_NAME = "reminders.db";
export const DB_FILE_PATH = path.join(DATA_DIR, DB_FILE_NAME);
