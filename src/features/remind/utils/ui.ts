import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    type TextChannel,
    MessageFlags,
    type ModalSubmitInteraction,
    type StringSelectMenuInteraction,
    type ButtonInteraction,
} from "discord.js";
import type { Reminder } from "../types";
import { reminderService } from "../reminder-service";
import { logger } from "../../../utils/logger";
import { 
    type ListState, 
    REMINDERS_PER_PAGE, 
    encodeState, 
    filterAndSortReminders, 
    getPageItems, 
    getTotalPages 
} from "./list";

export const REMIND_COLOR_SUCCESS = 0x00ff00; // 緑
export const REMIND_COLOR_WARN = 0xffff00; // 黄
export const REMIND_COLOR_ERROR = 0xff0000; // 赤
export const REMIND_COLOR_INFO = 0x0099ff; // 青

export const BUTTON_ID_REMIND_CANCEL = "remind_cancel";

// リスト操作用プレフィックス
export const LIST_SELECT_PREFIX = "remind_list_select";
export const LIST_NAV_PREV_PREFIX = "remind_list_prev";
export const LIST_NAV_NEXT_PREFIX = "remind_list_next";
export const LIST_NAV_PAGE_PREFIX = "remind_list_page";
export const LIST_ORDER_PREFIX = "remind_list_order";
export const LIST_SHOW_PREFIX = "remind_list_show";
export const LIST_EDIT_PREFIX = "remind_list_edit";
export const LIST_CANCEL_PREFIX = "remind_list_cancel";
export const LIST_RELOAD_PREFIX = "remind_list_reload";
export const LIST_PAGE_JUMP_PREFIX = "remind_list_jump";

/**
 * リマインダー登録完了のEmbedを生成
 */
export function buildAddResponseEmbed(
    reminder: Reminder,
    remindAtDate: Date,
): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(REMIND_COLOR_SUCCESS)
        .setTitle("✅ リマインダーをセットしました！")
        .setDescription(
            `**${remindAtDate.toLocaleString("ja-JP")}** にリマインドします。\n` +
                `ID: \`${reminder.id}\``,
        )
        .addFields({
            name: "📝 メッセージ",
            value: reminder.message,
        });

    return embed;
}

/**
 * リマインダー更新後の返信Embedを生成
 */
export function buildUpdateResponseEmbed(
    updated: Reminder,
    changes: string[],
): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(REMIND_COLOR_SUCCESS)
        .setTitle("✏️ リマインダー更新")
        .setDescription("リマインダーを更新しました！");

    if (changes.length > 0) {
        embed.addFields({
            name: "変更内容",
            value: changes.join("\n"),
        });
    }

    if (updated.replyMessageId && updated.replyChannelId) {
        const messageLink = `https://discord.com/channels/${updated.guildId}/${updated.replyChannelId}/${updated.replyMessageId}`;
        embed.addFields({
            name: "リンク",
            value: `[リマインダーを表示](${messageLink})`,
        });
    } else {
        embed.setFooter({
            text: `ID: ${updated.id} (元メッセージが見つかりませんでした)`,
        });
    }

    return embed;
}

/**
 * リマインダー詳細のEmbedを生成
 */
export function buildReminderDetailEmbed(reminder: Reminder): EmbedBuilder {
    const remindAtDate = new Date(reminder.remindAt);
    const embed = new EmbedBuilder()
        .setColor(REMIND_COLOR_INFO)
        .setTitle("📋 リマインダー詳細")
        .setDescription(`ID: \`${reminder.id}\``)
        .addFields(
            {
                name: "📅 日時",
                value: remindAtDate.toLocaleString("ja-JP"),
                inline: true,
            },
            {
                name: "📝 メッセージ",
                value: reminder.message,
            },
            {
                name: "👤 作成者",
                value: `<@${reminder.createdBy}>`,
                inline: true,
            },
            {
                name: "📢 チャンネル",
                value: `<#${reminder.channelId}>`,
                inline: true,
            },
        );

    if (reminder.replyMessageId && reminder.replyChannelId) {
        const messageLink = `https://discord.com/channels/${reminder.guildId}/${reminder.replyChannelId}/${reminder.replyMessageId}`;
        embed.addFields({
            name: "🔗 リンク",
            value: `[登録メッセージへ移動](${messageLink})`,
        });
    }

    return embed;
}

/**
 * エラーEmbedを生成
 */
export function buildErrorEmbed(message: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(REMIND_COLOR_ERROR)
        .setTitle("❌ エラー")
        .setDescription(message);
}

/**
 * リマインダー情報のEmbedを生成 (Legacy support/Generic use)
 */
export function buildReminderEmbed(
    reminder: Reminder,
    title = "✅ リマインダーを登録しました！",
): EmbedBuilder {
    const remindAt = new Date(reminder.remindAt);
    const unixTime = Math.floor(remindAt.getTime() / 1000);

    return new EmbedBuilder()
        .setColor(REMIND_COLOR_SUCCESS)
        .setTitle(title)
        .setDescription(`${reminder.message}\n\u200b`)
        .addFields(
            {
                name: "📅 日時",
                value: `<t:${unixTime}:S>`,
                inline: true,
            },
            {
                name: "📢 チャンネル",
                value: `<#${reminder.channelId}>`,
                inline: true,
            },
            {
                name: "🆔 ID",
                value: `\`${reminder.id}\``,
                inline: false,
            },
        );
}

/**
 * リマインダー送信完了時のEmbedを生成
 */
export function buildExecutedReminderEmbed(reminder: Reminder): EmbedBuilder {
    const remindAt = new Date(reminder.remindAt);
    const unixTime = Math.floor(remindAt.getTime() / 1000);

    return new EmbedBuilder()
        .setColor(REMIND_COLOR_INFO) // 青
        .setTitle("🚀 リマインダーを送信しました！")
        .setDescription(`${reminder.message}\n\u200b`)
        .addFields(
            {
                name: "📅 日時",
                value: `<t:${unixTime}:S>`,
                inline: true,
            },
            {
                name: "📢 チャンネル",
                value: `<#${reminder.channelId}>`,
                inline: true,
            },
        );
}

/**
 * リマインダーのボタン一式を生成
 */
export function buildReminderButtons(
    reminderId: string,
): ActionRowBuilder<ButtonBuilder> {
    const editButton = new ButtonBuilder()
        .setCustomId(`remind_edit:${reminderId}`)
        .setLabel("編集")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("✏️");

    const copyIdButton = new ButtonBuilder()
        .setCustomId(`remind_copy_id:${reminderId}`)
        .setLabel("ID")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📋");

    const reloadButton = new ButtonBuilder()
        .setCustomId(`remind_reload:${reminderId}`)
        .setLabel("更新")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔄");

    const cancelButton = new ButtonBuilder()
        .setCustomId(`${BUTTON_ID_REMIND_CANCEL}:${reminderId}`)
        .setLabel("登録解除")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️");

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        editButton,
        copyIdButton,
        cancelButton,
    );
}

/**
 * キャンセル済みのリマインダーEmbedを生成
 */
export function buildCancelEmbed(reminder: Reminder): EmbedBuilder {
    const remindAt = new Date(reminder.remindAt);
    const unixTime = Math.floor(remindAt.getTime() / 1000);

    return new EmbedBuilder()
        .setColor(REMIND_COLOR_ERROR)
        .setTitle("🗑️ このリマインダーは解除されました")
        .setDescription(`${reminder.message}`)
        .addFields(
            {
                name: "📅 日時",
                value: `<t:${unixTime}:S>`,
                inline: true,
            },
        )
        .addFields({
            name: "📢 チャンネル",
            value: `<#${reminder.channelId}>`,
            inline: true,
        });
}

/**
 * キャンセル済みのためのボタン（無効化）を生成
 */
export function buildCancelledButtons(
    reminderId: string,
): ActionRowBuilder<ButtonBuilder> {
    const editButton = new ButtonBuilder()
        .setCustomId(`disabled_edit:${reminderId}`)
        .setLabel("編集")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("✏️")
        .setDisabled(true);

    const cancelButton = new ButtonBuilder()
        .setCustomId(`disabled_cancel:${reminderId}`)
        .setLabel("登録解除")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️")
        .setDisabled(true);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        editButton,
        cancelButton,
    );
}

/**
 * 解除成功時のEmbedを生成
 */
export function buildCancelSuccessEmbed(reminder: Reminder): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(REMIND_COLOR_SUCCESS)
        .setTitle("🗑️ リマインダー解除")
        .setDescription(`リマインダー \`${reminder.id}\` を解除しました。`);

    if (reminder.replyMessageId && reminder.replyChannelId) {
        const messageLink = `https://discord.com/channels/${reminder.guildId}/${reminder.replyChannelId}/${reminder.replyMessageId}`;
        embed.addFields({
            name: "リンク",
            value: `[リマインダーを表示](${messageLink})`,
        });
    }

    return embed;
}

/**
 * 一覧のEmbedを生成する
 */
export function buildListEmbed(
    reminders: Reminder[],
    state: ListState,
    totalPages: number,
): EmbedBuilder {
    const orderLabel = state.order === "asc" ? "⬆️ 昇順" : "⬇️ 降順";

    if (reminders.length === 0) {
        return new EmbedBuilder()
            .setColor(REMIND_COLOR_INFO)
            .setTitle(`📋 リマインダー一覧 (${state.page + 1}/${totalPages})`)
            .setDescription("📭 リマインダーはありません。");
    }

    const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

    const embed = new EmbedBuilder()
        .setColor(REMIND_COLOR_INFO)
        .setTitle(`📋 リマインダー一覧 (${state.page + 1}/${totalPages})`)
        .setDescription(`ソート順: ${orderLabel}`);

    reminders.forEach((r, index) => {
        const remindAt = new Date(r.remindAt);
        const unixTime = Math.floor(remindAt.getTime() / 1000);
        const msgPreview =
            r.message.length > 50
                ? `${r.message.substring(0, 50)}...`
                : r.message;

        const emoji = NUMBER_EMOJIS[index] || `#${index + 1}`;

        embed.addFields({
            name: `\u200B\n${emoji} \`${r.id}\``,
            value: `📅 <t:${unixTime}:S> 📢 <#${r.channelId}>\n📝 ${msgPreview}`,
            inline: false,
        });
    });

    return embed;
}

/**
 * リマインダー選択用の Select Menu を生成する
 */
export function buildSelectMenu(
    reminders: Reminder[],
    state: ListState,
    selectedId?: string,
): ActionRowBuilder<StringSelectMenuBuilder> {
    const options = reminders.map((r, index) => {
        const date = new Date(r.remindAt);
        const dateStr = date.toLocaleString("ja-JP");
        const msgPreview =
            r.message.length > 20
                ? `${r.message.substring(0, 20)}...`
                : r.message;

        const emoji =
            ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"][index] ||
            `#${index + 1}`;

        return {
            label: `${emoji} ${dateStr}`,
            description: msgPreview,
            value: r.id,
            default: r.id === selectedId,
        };
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(encodeState(LIST_SELECT_PREFIX, state))
        .setPlaceholder("リマインダーを選択...")
        .addOptions(options);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        selectMenu,
    );
}

/**
 * 操作ボタン（詳細/編集/削除）を生成する
 */
export function buildActionButtons(
    state: ListState,
    selectedId?: string,
): ActionRowBuilder<ButtonBuilder> {
    const disabled = !selectedId;

    const showButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_SHOW_PREFIX, state, selectedId))
        .setLabel("詳細")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🔍")
        .setDisabled(disabled);

    const editButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_EDIT_PREFIX, state, selectedId))
        .setLabel("編集")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("✏️")
        .setDisabled(disabled);

    const cancelButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_CANCEL_PREFIX, state, selectedId))
        .setLabel("解除")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️")
        .setDisabled(disabled);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        showButton,
        editButton,
        cancelButton,
    );
}

/**
 * ナビゲーションボタン（前へ/ページ指定/次へ/順序切替）を生成する
 */
export function buildPaginationButtons(
    state: ListState,
    totalPages: number,
): ActionRowBuilder<ButtonBuilder> {
    const prevButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_NAV_PREV_PREFIX, state))
        .setLabel("前へ")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("◀")
        .setDisabled(state.page === 0);

    const pageButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_NAV_PAGE_PREFIX, state))
        .setLabel(`${state.page + 1}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary);

    const nextButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_NAV_NEXT_PREFIX, state))
        .setLabel("次へ")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("▶")
        .setDisabled(state.page >= totalPages - 1);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        prevButton,
        pageButton,
        nextButton,
    );
}

export function buildOtherNavButtons(
    state: ListState,
): ActionRowBuilder<ButtonBuilder> {
    const reloadButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_RELOAD_PREFIX, state))
        .setLabel("更新")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔄");

    const orderButton = new ButtonBuilder()
        .setCustomId(encodeState(LIST_ORDER_PREFIX, state))
        .setLabel(state.order === "asc" ? "昇順" : "降順")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(state.order === "asc" ? "⬆️" : "⬇️");

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        reloadButton,
        orderButton,
    );
}

/**
 * リマインダー一覧を描画・更新する
 * データ取得、フィルタリング、Embed構築、Interacton更新を一括で行う
 */
export async function renderReminderList(
    interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
    state: ListState,
    selectedId?: string
): Promise<void> {
    logger.info("🔍 renderReminderList called.");
    if (!interaction.guildId) return;

    try {
        const allReminders = await reminderService.getByGuild(interaction.guildId);
        const filtered = filterAndSortReminders(allReminders, state);
        const totalPages = getTotalPages(filtered.length);

        // 削除後などでページ範囲外になった場合、最終ページに調整
        if (state.page >= totalPages) state.page = Math.max(0, totalPages - 1);

        const pageItems = getPageItems(filtered, state.page);

        const embed = buildListEmbed(pageItems, state, totalPages);

        const components: ActionRowBuilder<any>[] = [];
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
        logger.info("✅ renderReminderList completed successfully");
    } catch (error) {
        logger.error("❌ renderReminderList failed:", error);
        throw error;
    }
}
