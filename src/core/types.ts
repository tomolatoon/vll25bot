import type {
    AnySelectMenuInteraction,
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
 * customId format: "{idPrefix}:{args}"
 */
export interface ButtonHandler {
    idPrefix: string;
    type: "BUTTON";
    execute: (interaction: ButtonInteraction, id: string) => Promise<void>;
}

/**
 * セレクトメニューハンドラーの共通インターフェース
 * customId format: "{idPrefix}:{args}"
 */
export interface SelectMenuHandler {
    idPrefix: string;
    type: "SELECT";
    execute: (
        interaction: AnySelectMenuInteraction,
        id: string,
    ) => Promise<void>;
}

/**
 * モーダルハンドラーの共通インターフェース
 * customId format: "{idPrefix}:{args}"
 */
export interface ModalHandler {
    idPrefix: string;
    type: "MODAL";
    execute: (interaction: ModalSubmitInteraction, id: string) => Promise<void>;
}
