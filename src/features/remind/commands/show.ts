import { logger } from "@utils/logger";
import {
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandSubcommandBuilder,
} from "discord.js";
import { buildReminderButtons } from "../components/actions";
import { buildReminderDetailEmbed } from "../components/embeds";
import { reminderService } from "../services/reminder-service";

const data = new SlashCommandSubcommandBuilder()
    .setName("show")
    .setDescription("リマインダーの詳細を表示します")
    .addStringOption((option) =>
        option.setName("id").setDescription("リマインダーID").setRequired(true),
    );

async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const id = interaction.options.getString("id", true);
        if (!interaction.guildId) return;

        const reminder = await reminderService.getReminderById(id);

        if (!reminder) {
            await interaction.reply({
                content: `❌ リマインダー \`${id}\` が見つかりません。`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (reminder.guildId !== interaction.guildId) {
            await interaction.reply({
                content: "❌ 他のサーバーのリマインダーは表示できません。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const embed = buildReminderDetailEmbed(reminder);
        const buttons = buildReminderButtons(reminder.id);

        await interaction.reply({
            embeds: [embed],
            components: [buttons],
            flags: MessageFlags.Ephemeral,
        });
    } catch (error) {
        logger.error("❌ /remind show 実行エラー:", error);
        const content = "❌ コマンドの実行中にエラーが発生しました。";
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content });
        } else {
            await interaction.reply({ content, flags: MessageFlags.Ephemeral });
        }
    }
}

export default { data, execute };
