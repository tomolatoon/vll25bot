import type { SelectMenuHandler } from "@core/types";
import type { AnySelectMenuInteraction } from "discord.js";
import { LIST_SELECT_PREFIX } from "../constants";
import { buildReminderListView } from "../services/renderer";
import { decodeState } from "../utils/list";

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
        const { embed, components } = await buildReminderListView(
            interaction.guildId,
            state,
            selectedId,
        );

        await interaction.editReply({
            embeds: [embed],
            components: components,
        });
    },
};

export default listSelectHandler;
