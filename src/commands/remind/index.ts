import {
    type ChatInputCommandInteraction,
    SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../../types";
import { addCommand, handleAdd } from "./add";
import { cancelCommand, handleCancel } from "./cancel";
import { handleList, listCommand } from "./list";
import { handleModify, modifyCommand } from "./modify";
import { handleShow, showCommand } from "./show";

export { BUTTON_ID_REMIND_CANCEL } from "../../lib/remind-ui";
export {
    buildReminderButtons,
    buildReminderMessage,
} from "../../lib/remind-ui";
export { cancelReminder } from "../../lib/remind";

export const remind: Command = {
    data: new SlashCommandBuilder()
        .setName("remind")
        .setDescription("リマインダーを設定します")
        .addSubcommand(addCommand)
        .addSubcommand(listCommand)
        .addSubcommand(showCommand)
        .addSubcommand(modifyCommand)
        .addSubcommand(cancelCommand),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case "add":
                await handleAdd(interaction);
                break;
            case "list":
                await handleList(interaction);
                break;
            case "show":
                await handleShow(interaction);
                break;
            case "modify":
                await handleModify(interaction);
                break;
            case "cancel":
                await handleCancel(interaction);
                break;
        }
    },
};
