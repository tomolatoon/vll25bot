/**
 * types.ts - 型定義
 */

import type {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
} from "discord.js";

/** スラッシュコマンドの共通インターフェース */
export interface Command {
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/** おみくじの運勢データ */
export interface Fortune {
    result: string; // 運勢（例: "大吉"）
    emoji: string; // 絵文字
    color: number; // Embedの色（16進数）
}
