import type { AnySelectMenuInteraction } from "discord.js";
import type { SelectMenuHandler } from "../../../core/types";
import { decodeState } from "../utils/list";
import {
    LIST_SELECT_PREFIX,
    renderReminderList,
} from "../utils/ui";

export const listSelectHandler: SelectMenuHandler = {
    idPrefix: LIST_SELECT_PREFIX,
    type: "SELECT",
    async execute(interaction: AnySelectMenuInteraction) {
        if (!interaction.guildId) return;

        // 文字列セレクトメニューであることを確認
        if (!interaction.isStringSelectMenu()) return;

        await interaction.deferUpdate();

        const selectedId = interaction.values[0];
        const { state } = decodeState(
            interaction.customId,
            interaction.guildId,
            interaction.user.id,
        );

        // UIを更新
        // 状態は変わらないが、選択されたリマインダー情報などが必要になる処理は renderReminderList 内 (buildSelectMenu等) で処理される
        // ただし renderReminderList は全描画を行う。
        // リスト選択時の挙動は「選択状態の更新」と「アクションボタンの活性化」
        // selectedId を渡して描画する
        await renderReminderList(interaction, state, selectedId);
    },
};

export default listSelectHandler;
