import type {
    ActionRowBuilder,
    MessageActionRowComponentBuilder,
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
 * リマインダー一覧の描画用データ（Embedとコンポーネント）を構築する
 * 責務: データ取得、フィルタリング、ページ調整、UI構築
 */
export async function buildReminderListView(
    guildId: string,
    state: ListState,
    selectedId?: string,
) {
    const allReminders = await reminderService.getByGuild(guildId);
    const filtered = filterAndSortReminders(allReminders, state);
    const totalPages = getTotalPages(filtered.length);

    // ページ範囲外の場合は丸める
    state.page = Math.max(0, Math.min(state.page, Math.max(0, totalPages - 1)));

    const pageItems = getPageItems(filtered, state.page);
    const embed = buildListEmbed(pageItems, state, totalPages);

    const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
    if (pageItems.length > 0) {
        components.push(buildSelectMenu(pageItems, state, selectedId));
        components.push(buildActionButtons(state, selectedId));
    }
    components.push(buildPaginationButtons(state, totalPages));
    components.push(buildOtherNavButtons(state));

    return { embed, components };
}
