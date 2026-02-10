import type { ButtonHandler } from "@core/types";
import { type ButtonInteraction, MessageFlags } from "discord.js";

export const copyIdHandler: ButtonHandler = {
    idPrefix: "remind_copy_id:",
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
