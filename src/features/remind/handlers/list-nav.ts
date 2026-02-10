import type { ButtonHandler } from "@core/types";
import type { ButtonInteraction } from "discord.js";
import { LIST_NAV_CATCH_ALL_PREFIX } from "../constants";
import { renderReminderList } from "../services/renderer";
import { decodeState, getNextState } from "../utils/list";

export const listNavHandler: ButtonHandler = {
    idPrefix: LIST_NAV_CATCH_ALL_PREFIX,
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guildId) return;
        await interaction.deferUpdate();

        const { state } = decodeState(
            interaction.customId,
            interaction.guildId,
            interaction.user.id,
        );

        const nextState = getNextState(state, interaction.customId);

        await renderReminderList(interaction, nextState);
    },
};

export default listNavHandler;
