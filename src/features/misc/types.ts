/**
 * types.ts - misc機能の型定義
 */

import type { Command } from "@core/types";

export type { Command };

/**
 * おみくじの運勢定義
 */
export interface Fortune {
    /** 運勢の結果テキスト（例: 大吉） */
    result: string;
    /** 表示する絵文字 */
    emoji: string;
    /** Embedの色（10進数） */
    color: number;
}
