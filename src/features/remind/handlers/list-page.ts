import type { ButtonHandler } from "@core/types";
import {
    ActionRowBuilder,
    type ButtonInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { LIST_NAV_PAGE_PREFIX, LIST_PAGE_JUMP_PREFIX } from "../constants";
import { reminderService } from "../services/reminder-service";
import {
    decodeState,
    filterAndSortReminders,
    getTotalPages,
} from "../utils/list";

export const listPageHandler: ButtonHandler = {
    idPrefix: LIST_NAV_PAGE_PREFIX,
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guildId) return;

        // Modal表示は defer できないのでそのまま
        const { state } = decodeState(
            interaction.customId,
            interaction.guildId,
            interaction.user.id,
        );
        const encodedState = interaction.customId.replace(
            `${LIST_NAV_PAGE_PREFIX}:`,
            "",
        );

        // ページ数計算のためにリマインダーを取得
        const allReminders = await reminderService.getByGuild(
            interaction.guildId,
        );
        const filtered = filterAndSortReminders(allReminders, state);
        const totalPages = getTotalPages(filtered.length);

        const modal = new ModalBuilder()
            .setCustomId(`${LIST_PAGE_JUMP_PREFIX}:${encodedState}`)
            .setTitle("ページ指定");

        const pageInput = new TextInputBuilder()
            .setCustomId("page")
            .setLabel(`ページ番号を入力 (1~${totalPages})`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`1~${totalPages}`)
            .setRequired(true)
            .setValue(String(state.page + 1));

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
            pageInput,
        );
        modal.addComponents(row);

        await interaction.showModal(modal);
    },
};

export default listPageHandler;
