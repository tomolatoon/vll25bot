import {
    type ChatInputCommandInteraction,
    SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../../../core/types";
import add from "./add";
import cancel from "./cancel";
import list from "./list";
import modify from "./modify";
import show from "./show";

const data = new SlashCommandBuilder()
    .setName("remind")
    .setDescription("リマインダーを管理します")
    .addSubcommand(add.data)
    .addSubcommand(cancel.data)
    .addSubcommand(list.data)
    .addSubcommand(modify.data)
    .addSubcommand(show.data);

async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case "add":
            await add.execute(interaction);
            break;
        case "cancel":
            await cancel.execute(interaction);
            break;
        case "list":
            await list.execute(interaction);
            break;
        case "modify":
            await modify.execute(interaction);
            break;
        case "show":
            await show.execute(interaction);
            break;
        default:
            // Should not happen
            break;
    }
}

export default { data, execute } as Command;
