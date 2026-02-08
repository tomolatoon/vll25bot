import {
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../../../core/types";
import { buildCancelSuccessEmbed } from "../components/embeds";
import { reminderService } from "../reminder-service";

export const reminderCancel: Command = {
    data: new SlashCommandBuilder()
        .setName("cancel")
        .setDescription("リマインダーを解除（削除）します")
        .addStringOption((option) =>
            option
                .setName("id")
                .setDescription("リマインダーID")
                .setRequired(true),
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const id = interaction.options.getString("id", true);

        const result = await reminderService.cancel(
            id,
            interaction.user.id,
            interaction.guildId || undefined,
        );

        if (result.success) {
            await interaction.reply({
                embeds: [buildCancelSuccessEmbed(result.reminder)],
                flags: MessageFlags.Ephemeral,
            });
        } else {
            const reason =
                result.reason === "not_found"
                    ? "リマインダーが見つかりません。"
                    : result.reason === "not_owner"
                      ? "自分が登録したリマインダーのみ解除できます。"
                      : result.reason === "wrong_guild"
                        ? "このサーバーのリマインダーではありません。"
                        : "解除に失敗しました。";

            await interaction.reply({
                content: `❌ ${reason}`,
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
