import { logger } from "@utils/logger";
import {
    type ActionRowBuilder,
    type ButtonInteraction,
    type MessageActionRowComponentBuilder,
    MessageFlags,
    type ModalSubmitInteraction,
    type StringSelectMenuInteraction,
} from "discord.js";
import {
    buildActionButtons,
    buildOtherNavButtons,
    buildPaginationButtons,
    buildSelectMenu,
} from "../components/actions";
import { buildListEmbed } from "../components/embeds";
import { reminderService } from "../services/reminder-service";
import {
    type ListState,
    filterAndSortReminders,
    getPageItems,
    getTotalPages,
} from "../utils/list";

/**
 * リマインダー一覧を描画・更新する
 * データ取得、フィルタリング、Embed構築、Interacton更新を一括で行う
 */
export async function renderReminderList(
    interaction:
        | ButtonInteraction
        | StringSelectMenuInteraction
        | ModalSubmitInteraction,
    state: ListState,
    selectedId?: string,
): Promise<void> {
    if (!interaction.guildId) {
        logger.warn("⚠️ renderReminderList: guildId が取得できません");
        return;
    }

    try {
        const allReminders = await reminderService.getByGuild(
            interaction.guildId,
        );
        const filtered = filterAndSortReminders(allReminders, state);
        const totalPages = getTotalPages(filtered.length);

        // 削除後などでページ範囲外になった場合、最終ページに調整
        if (state.page >= totalPages) state.page = Math.max(0, totalPages - 1);

        const pageItems = getPageItems(filtered, state.page);

        const embed = buildListEmbed(pageItems, state, totalPages);

        const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] =
            [];
        if (pageItems.length > 0) {
            components.push(buildSelectMenu(pageItems, state, selectedId));
            components.push(buildActionButtons(state, selectedId));
        }
        components.push(buildPaginationButtons(state, totalPages));
        components.push(buildOtherNavButtons(state));

        const updateOptions = {
            embeds: [embed],
            components: components,
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(updateOptions);
        } else if (interaction.isModalSubmit()) {
            if (interaction.isFromMessage()) {
                await interaction.update(updateOptions);
            } else {
                await interaction.reply({
                    ...updateOptions,
                    flags: MessageFlags.Ephemeral,
                });
            }
        } else {
            // ボタンまたはセレクトメニュー
            await interaction.update(updateOptions);
        }
    } catch (error) {
        logger.error(
            "❌ renderReminderList: 処理中にエラーが発生しました",
            error,
        );
        throw error;
    }
}
