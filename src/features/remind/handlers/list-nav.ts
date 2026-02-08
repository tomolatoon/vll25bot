import type { ButtonInteraction } from "discord.js";
import type { ButtonHandler } from "../../../core/types";
import { decodeState, getNextState } from "../utils/list";
import { renderReminderList } from "../services/renderer";

export const listNavHandler: ButtonHandler = {
    idPrefix: "remind_list_",
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guildId) return;
        await interaction.deferUpdate();
        
        const { state } = decodeState(
            interaction.customId,
            interaction.guildId,
            interaction.user.id
        );

        const nextState = getNextState(state, interaction.customId);
        
        await renderReminderList(interaction, nextState);
    },
};

export default listNavHandler;
