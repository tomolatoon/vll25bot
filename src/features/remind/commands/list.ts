import {
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../../../core/types";
import { reminderService } from "../reminder-service";

import { renderReminderList } from "../services/renderer";
import {
    filterAndSortReminders,
    getTotalPages,
    paginateReminders,
} from "../utils/list";

export const reminderList: Command = {
    data: new SlashCommandBuilder()
        .setName("list")
        .setDescription("登録済みリマインダー一覧を表示します")
        .addIntegerOption((option) =>
            option
                .setName("page")
                .setDescription("表示するページ番号")
                .setRequired(false)
                .setMinValue(1),
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // 全件取得
        const reminders = await reminderService.getByGuild(interaction.guildId);

        if (reminders.length === 0) {
            await interaction.editReply("📭 リマインダーはありません。");
            return;
        }

        // 初期状態
        const page = (interaction.options.getInteger("page") || 1) - 1;
        const totalPages = getTotalPages(reminders.length);
        const safePage = Math.max(0, Math.min(page, totalPages - 1));

        const state = {
            page: safePage,
            sort: "date_asc" as const,
        };

        await renderReminderList(interaction, state);
    },
};
