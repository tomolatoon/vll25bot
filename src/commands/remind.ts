/**
 * remind.ts - リマインダーコマンド
 *
 * 指定した日時にメッセージを自動送信します。
 */

import {
    ActionRowBuilder,
    ButtonBuilder,
    type ButtonInteraction,
    ButtonStyle,
    ChannelType,
    type ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
    type TextChannel,
} from "discord.js";
import { parseFutureDateTime } from "../lib/parser/date-parser";
import {
    createReminder,
    getReminderById,
    getRemindersByGuild,
    stopReminder,
} from "../reminder";
import type { Command } from "../types";

/** リマインダー解除ボタンのIDプレフィックス */
export const BUTTON_ID_REMIND_CANCEL = "remind_cancel";

export const remind: Command = {
    data: new SlashCommandBuilder()
        .setName("remind")
        .setDescription("リマインダーを設定します")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("リマインダーを追加します")
                .addStringOption((option) =>
                    option
                        .setName("message")
                        .setDescription("送信するメッセージ")
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("datetime")
                        .setDescription(
                            "送信日時 (例: 2026/01/15 9:00, 明日 9:00, 1分後 など)",
                        )
                        .setRequired(true),
                )
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription(
                            "送信先チャンネル（省略で現在のチャンネル）",
                        )
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("list")
                .setDescription("チャンネルのリマインダーを表示します")
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription(
                            "表示するリマインダーの送信先チャンネル（省略で現在のチャンネル）",
                        )
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false),
                )
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription(
                            "表示するリマインダーの作成者（省略で全員）",
                        )
                        .setRequired(false),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("list_all")
                .setDescription("ギルド内の自分のリマインダーを全て表示します"),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("リマインダーを削除します")
                .addStringOption((option) =>
                    option
                        .setName("id")
                        .setDescription("削除するリマインダーのID")
                        .setRequired(true),
                ),
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case "add":
                await handleAdd(interaction);
                break;
            case "list":
                await handleList(interaction);
                break;
            case "list_all":
                await handleListAll(interaction);
                break;
            case "remove":
                await handleRemove(interaction);
                break;
        }
    },
};

/** リマインダー追加 */
async function handleAdd(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    const message = interaction.options.getString("message", true);
    const datetimeStr = interaction.options.getString("datetime", true);
    const targetChannel =
        (interaction.options.getChannel("channel") as TextChannel | null) ||
        (interaction.channel as TextChannel);

    // 日時をパース
    const remindAt = parseFutureDateTime(datetimeStr);
    if (!remindAt) {
        await interaction.reply({
            content:
                "❌ 日時の形式を正しく入力してください。\n例: 2026/01/15 9:00, 明日 9:00, 1分後 など",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // 過去の日時チェック
    if (remindAt <= new Date()) {
        await interaction.reply({
            content: "❌ 未来の日時を指定してください。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!interaction.guildId) {
        await interaction.reply({
             content: "❌ このコマンドはサーバー内でのみ使用できます。",
             flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // リマインダー作成
    const reminder = createReminder(
        targetChannel.id,
        message,
        remindAt,
        interaction.user.id,
        interaction.guildId,
    );

    if (!reminder) {
        await interaction.reply({
            content: "❌ リマインダーの登録に失敗しました。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // キャンセルボタンを作成
    const cancelButton = new ButtonBuilder()
        .setCustomId(`${BUTTON_ID_REMIND_CANCEL}:${reminder.id}`)
        .setLabel("登録解除")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        cancelButton,
    );

    await interaction.reply({
        content: `✅ リマインダーを登録しました！\n\n📅 **日時**: ${remindAt.toLocaleString("ja-JP")}\n📝 **メッセージ**: ${message}\n📢 **チャンネル**: <#${targetChannel.id}>\n🆔 **ID**: \`${reminder.id}\``,
        components: [row],
    });
}

/** リマインダー一覧 (チャンネル指定) */
async function handleList(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    if (!interaction.guildId) return;
    const guildId = interaction.guildId;
    const targetChannel =
        (interaction.options.getChannel("channel") as TextChannel | null) ||
        (interaction.channel as TextChannel);
    // user 省略時は全員のリマインダーを表示
    const targetUser = interaction.options.getUser("user");

    const reminders = getRemindersByGuild(guildId).filter(
        (r) =>
            r.channelId === targetChannel.id &&
            (targetUser === null || r.createdBy === targetUser.id),
    );

    // フィルター条件の説明テキストを作成
    const filterDesc =
        targetUser === null
            ? `<#${targetChannel.id}> の`
            : `<#${targetChannel.id}> の <@${targetUser.id}> が登録した`;

    if (reminders.length === 0) {
        await interaction.reply({
            content: `📭 ${filterDesc}リマインダーはありません。`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const list = reminders
        .map((r) => {
            const date = new Date(r.remindAt);
            return (
                `🆔 \`${r.id}\`\n` +
                `　📅 ${date.toLocaleString("ja-JP")}\n` +
                `　📝 ${
                    r.message.length > 30
                        ? `${r.message.substring(0, 30)}...`
                        : r.message
                }`
            );
        })
        .join("\n\n");

    await interaction.reply({
        content: `📋 **${filterDesc}リマインダー（${reminders.length}件）**\n\n${list}`,
        flags: MessageFlags.Ephemeral,
    });
}

/** リマインダー一覧 (ギルド全体) */
async function handleListAll(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    if (!interaction.guildId) return;
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const reminders = getRemindersByGuild(guildId).filter(
        (r) => r.createdBy === userId,
    );

    if (reminders.length === 0) {
        await interaction.reply({
            content: "📭 このサーバーにあなたのリマインダーはありません。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const list = reminders
        .map((r) => {
            const date = new Date(r.remindAt);
            return (
                `🆔 \`${r.id}\`\n` +
                `　📅 ${date.toLocaleString("ja-JP")}\n` +
                `　📢 <#${r.channelId}>\n` +
                `　📝 ${
                    r.message.length > 30
                        ? `${r.message.substring(0, 30)}...`
                        : r.message
                }`
            );
        })
        .join("\n\n");

    await interaction.reply({
        content: `📋 **あなたのリマインダー（${reminders.length}件）**\n\n${list}`,
        flags: MessageFlags.Ephemeral,
    });
}

/** リマインダー解除の結果 */
type CancelReminderResult =
    | { success: true }
    | {
          success: false;
          reason: "not_found" | "wrong_guild" | "not_owner" | "already_done";
      };

/**
 * リマインダーを解除する共通処理
 * @param id リマインダーID
 * @param userId 実行者のユーザーID
 * @param guildId ギルドID（コマンドからの削除時のみ指定）
 */
function cancelReminder(
    id: string,
    userId: string,
    guildId?: string,
): CancelReminderResult {
    const reminder = getReminderById(id);

    if (!reminder) {
        return { success: false, reason: "not_found" };
    }

    if (guildId && reminder.guildId !== guildId) {
        return { success: false, reason: "wrong_guild" };
    }

    if (reminder.createdBy !== userId) {
        return { success: false, reason: "not_owner" };
    }

    const stopped = stopReminder(id);
    if (!stopped) {
        return { success: false, reason: "already_done" };
    }

    return { success: true };
}

/** リマインダー削除 */
async function handleRemove(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    const id = interaction.options.getString("id", true);
    if (!interaction.guildId) return;
    const result = cancelReminder(
        id,
        interaction.user.id,
        interaction.guildId,
    );

    if (!result.success) {
        const errorMessages = {
            not_found:
                "指定されたIDのリマインダーがこのサーバーに見つかりません。",
            wrong_guild:
                "指定されたIDのリマインダーがこのサーバーに見つかりません。",
            not_owner: "自分が登録したリマインダーのみ解除できます。",
            already_done: "既に実行済みか解除済みです。",
        };
        await interaction.reply({
            content: `❌ ${errorMessages[result.reason]}`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.reply({
        content: `🗑️ リマインダー \`${id}\` を解除しました。`,
    });
}

/** リマインダー解除ボタンの処理 */
export async function handleRemindCancelButton(
    interaction: ButtonInteraction,
    id: string,
): Promise<void> {
    const result = cancelReminder(id, interaction.user.id);

    if (!result.success) {
        if (result.reason === "not_owner") {
            await interaction.reply({
                content: "❌ 自分が登録したリマインダーのみ解除できます。",
                flags: MessageFlags.Ephemeral,
            });
        } else {
            // not_found, already_done の場合
            // wrong_guild は発生しない想定
            await interaction.update({
                content: `❓ リマインダー \`${id}\` は既に解除済みです。`,
                components: [],
            });
        }
        return;
    }

    await interaction.update({
        content: `🗑️ リマインダー \`${id}\` を解除しました。`,
        components: [],
    });
}
