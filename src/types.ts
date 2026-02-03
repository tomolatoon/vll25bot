import type {
    ButtonInteraction,
    ChatInputCommandInteraction,
    ModalSubmitInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

/** スラッシュコマンドの共通インターフェース */
export interface Command {
    data:
        | SlashCommandBuilder
        | SlashCommandOptionsOnlyBuilder
        | SlashCommandSubcommandsOnlyBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/**
 * ボタンハンドラーの共通インターフェース
 *
 * ボタンの customId は `{idPrefix}:{引数}` の形式を想定。
 * 例: "remind_cancel:abc123" → idPrefix="remind_cancel", id="abc123"
 */
export interface ButtonHandler {
    /** ボタンIDのプレフィックス（例: "remind_cancel"） */
    idPrefix: string;
    /**
     * ボタンクリック時の処理
     * @param interaction ボタンインタラクション
     * @param id customId から抽出した引数部分
     */
    execute: (interaction: ButtonInteraction, id: string) => Promise<void>;
}

/**
 * モーダルハンドラーの共通インターフェース
 *
 * モーダルの customId は `{idPrefix}:{引数}` の形式を想定。
 * 例: "remind_edit_modal:abc123" → idPrefix="remind_edit_modal", id="abc123"
 */
export interface ModalHandler {
    /** モーダルIDのプレフィックス（例: "remind_edit_modal"） */
    idPrefix: string;
    /**
     * モーダル送信時の処理
     * @param interaction モーダル送信インタラクション
     * @param id customId から抽出した引数部分
     */
    execute: (interaction: ModalSubmitInteraction, id: string) => Promise<void>;
}

/** おみくじの運勢データ */
export interface Fortune {
    result: string; // 運勢（例: "大吉"）
    emoji: string; // 絵文字
    color: number; // Embedの色（16進数）
}
