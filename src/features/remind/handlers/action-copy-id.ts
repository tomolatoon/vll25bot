import type { ButtonHandler } from "@core/types";
import { type ButtonInteraction, MessageFlags } from "discord.js";
import { BUTTON_ID_REMIND_COPY_ID } from "../constants";

export const copyIdHandler: ButtonHandler = {
    idPrefix: BUTTON_ID_REMIND_COPY_ID,
    type: "BUTTON",
    async execute(interaction: ButtonInteraction) {
        const reminderId = interaction.customId.split(":")[1];
        await interaction.reply({
            content: `\`${reminderId}\``,
            flags: MessageFlags.Ephemeral,
        });
    },
};

export default copyIdHandler;
