import {
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../../../core/types";
import { parseFutureDateTime } from "../../../lib/parser/date-parser";
import { buildUpdateResponseEmbed } from "../components/embeds";
import { reminderService } from "../reminder-service";
import { validateReminderForUpdate } from "../utils/validation";

export const reminderModify: Command = {
    data: new SlashCommandBuilder()
        .setName("modify")
        .setDescription("リマインダーを修正します")
        .addStringOption((option) =>
            option
                .setName("id")
                .setDescription("リマインダーID")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("message")
                .setDescription("新しいメッセージ")
                .setRequired(false),
        )
        .addStringOption((option) =>
            option
                .setName("datetime")
                .setDescription("新しい日時 (例: 明日 10:00)")
                .setRequired(false),
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const id = interaction.options.getString("id", true);
        const newMessage = interaction.options.getString("message");
        const newDateStr = interaction.options.getString("datetime");

        if (!newMessage && !newDateStr) {
            await interaction.reply({
                content: "❌ メッセージまたは日時を指定してください。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const validation = await validateReminderForUpdate(
            id,
            interaction.user.id,
            interaction.guildId || undefined,
        );

        if (!validation.success) {
            await interaction.editReply(`❌ ${validation.error}`);
            return;
        }

        const updates: { message?: string; remindAt?: number } = {};

        if (newMessage) {
            updates.message = newMessage;
        }

        if (newDateStr) {
            const date = parseFutureDateTime(newDateStr);
            if (!date) {
                await interaction.editReply(
                    "❌ 日時の形式が正しくありません。\n例: 2026/01/15 9:00, 明日 9:00, 1分後 など",
                );
                return;
            }
            if (date <= new Date()) {
                await interaction.editReply(
                    "❌ 未来の日時を指定してください。",
                );
                return;
            }
            updates.remindAt = date.getTime();
        }

        const updated = await reminderService.update(id, updates);

        if (updated) {
            await interaction.editReply({
                embeds: [
                    buildUpdateResponseEmbed(
                        updated,
                        updates.message,
                        updates.remindAt
                            ? new Date(updates.remindAt)
                            : undefined,
                        undefined, // Channel ID change not supported in command yet
                    ),
                ],
            });
        } else {
            await interaction.editReply(
                "❌ 更新に失敗しました (IDが見つからないか、過去の日時です)。",
            );
        }
    },
};
