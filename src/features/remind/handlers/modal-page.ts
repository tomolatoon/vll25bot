import type { ModalHandler } from "@core/types";
import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import { LIST_PAGE_JUMP_PREFIX } from "../constants";
import { buildReminderListView } from "../services/renderer";
import { decodeState } from "../utils/list";

export const pageJumpModalHandler: ModalHandler = {
    idPrefix: LIST_PAGE_JUMP_PREFIX,
    type: "MODAL",
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.guildId) return;

        const input = interaction.fields.getTextInputValue("page");
        const pageNum = Number.parseInt(input, 10);

        if (Number.isNaN(pageNum) || pageNum < 1) {
            await interaction.reply({
                content: "❌ 有効なページ番号を入力してください。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // モーダルのcustomIdから現在の状態をデコード
        // フォーマット: remind_list_jump:<encoded_state>
        const { state } = decodeState(
            interaction.customId,
            interaction.guildId,
            interaction.user.id,
        );

        // ページ番号を更新 (0始まり)
        state.page = pageNum - 1;

        // 新しい状態でリストを再描画
        const { embed, components } = await buildReminderListView(
            interaction.guildId,
            state,
        );

        if (interaction.isFromMessage()) {
            await interaction.update({
                embeds: [embed],
                components: components,
            });
        }
    },
};

export default pageJumpModalHandler;
