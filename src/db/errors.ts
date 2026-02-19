/**
 * データベース操作に関するカスタムエラークラス
 */

/**
 * データベース操作の基本エラークラス
 */
export class DatabaseError extends Error {
    constructor(
        message: string,
        public readonly cause?: unknown,
    ) {
        super(message);
        this.name = "DatabaseError";
    }
}

/**
 * レコードが見つからない場合のエラー
 */
export class NotFoundError extends DatabaseError {
    constructor(message: string) {
        super(message);
        this.name = "NotFoundError";
    }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends DatabaseError {
    constructor(
        message: string,
        public readonly field?: string,
    ) {
        super(message);
        this.name = "ValidationError";
    }
}

/**
 * 同時実行制御エラー（楽観的ロック失敗など）
 */
export class ConcurrencyError extends DatabaseError {
    constructor(message: string) {
        super(message);
        this.name = "ConcurrencyError";
    }
}
