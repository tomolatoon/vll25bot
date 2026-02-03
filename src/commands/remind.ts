/**
 * remind.ts - リマインダーコマンド
 *
 * 指定した日時にメッセージを自動送信します。
 */

import {
    ActionRowBuilder,
    ButtonBuilder,
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
    type ReminderData,
    stopReminder,
    updateReminder,
} from "../reminder";
import type { Command } from "../types";

/** リマインダー解除ボタンのIDプレフィックス */
export const BUTTON_ID_REMIND_CANCEL = "remind_cancel";

/**
 * リマインダー情報のメッセージを生成
 * @param reminder リマインダーデータ
 * @returns フォーマットされたメッセージ
 */
export function buildReminderMessage(reminder: ReminderData): string {
    const remindAt = new Date(reminder.remindAt);
    return `✅ リマインダー\n\n📅 **日時**: ${remindAt.toLocaleString("ja-JP")}\n📝 **メッセージ**: ${reminder.message}\n📢 **チャンネル**: <#${reminder.channelId}>\n🆔 **ID**: \`${reminder.id}\``;
}

/**
 * リマインダーのボタン一式を生成
 * @param reminderId リマインダーID
 * @returns ボタンを含む ActionRow
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
        reloadButton,
        cancelButton,
    );
}

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
                .setName("modify")
                .setDescription("リマインダーを編集します")
                .addStringOption((option) =>
                    option
                        .setName("id")
                        .setDescription("編集するリマインダーのID")
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
                        .setDescription(
                            "新しい日時 (例: 2026/01/15 9:00, 明日 9:00)",
                        )
                        .setRequired(false),
                )
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("新しい送信先チャンネル")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false),
                ),
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
            case "modify":
                await handleModify(interaction);
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

    // ボタンを作成
    const row = buildReminderButtons(reminder.id);

    const reply = await interaction.reply({
        content: buildReminderMessage(reminder),
        components: [row],
    });

    // リプライメッセージのIDを保存
    updateReminder(reminder.id, {
        replyMessageId: reply.id,
        replyChannelId: interaction.channelId,
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

/** リマインダー編集（コマンド） */
async function handleModify(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    const id = interaction.options.getString("id", true);
    const newMessage = interaction.options.getString("message") || undefined;
    const datetimeStr =
        interaction.options.getString("datetime") || undefined;
    const newChannel =
        (interaction.options.getChannel("channel") as TextChannel | null) ||
        undefined;

    if (!interaction.guildId) return;

    const reminder = getReminderById(id);

    if (!reminder) {
        await interaction.reply({
            content: "❌ リマインダーが見つかりません。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // 権限チェック
    if (reminder.createdBy !== interaction.user.id) {
        await interaction.reply({
            content: "❌ 自分が登録したリマインダーのみ編集できます。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // ギルドチェック
    if (reminder.guildId !== interaction.guildId) {
        await interaction.reply({
            content:
                "❌ 指定されたIDのリマインダーがこのサーバーに見つかりません。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // 日時のパース
    let newRemindAt: Date | undefined;
    if (datetimeStr) {
        newRemindAt = parseFutureDateTime(datetimeStr) || undefined;
        if (!newRemindAt) {
            await interaction.reply({
                content:
                    "❌ 日時の形式を正しく入力してください。\n例: 2026/01/15 9:00, 明日 9:00, 1分後 など",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 過去の日時チェック
        if (newRemindAt <= new Date()) {
            await interaction.reply({
                content: "❌ 未来の日時を指定してください。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
    }

    // 更新項目がない場合
    if (!newMessage && !newRemindAt && !newChannel) {
        await interaction.reply({
            content: "❌ 変更する項目を少なくとも1つ指定してください。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // リマインダーを更新
    const updated = updateReminder(id, {
        message: newMessage,
        remindAt: newRemindAt,
        channelId: newChannel?.id,
    });

    if (!updated) {
        await interaction.reply({
            content: "❌ リマインダーの更新に失敗しました。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // 変更内容を表示
    const changes: string[] = [];
    if (newMessage) changes.push(`📝 メッセージ: ${newMessage}`);
    if (newRemindAt)
        changes.push(`📅 日時: ${newRemindAt.toLocaleString("ja-JP")}`);
    if (newChannel) changes.push(`📢 チャンネル: <#${newChannel.id}>`);

    // 元のリプライメッセージを更新（保存されている場合）
    if (updated.replyMessageId && updated.replyChannelId) {
        try {
            const channel = await interaction.client.channels.fetch(
                updated.replyChannelId,
            );
            if (channel?.isTextBased()) {
                const message = await channel.messages.fetch(
                    updated.replyMessageId,
                );
                
                // 元メッセージを更新
                await message.edit({
                    content: buildReminderMessage(updated),
                    components: [buildReminderButtons(updated.id)],
                });

                // メッセージリンクを生成
                const messageLink = `https://discord.com/channels/${updated.guildId}/${updated.replyChannelId}/${updated.replyMessageId}`;

                // コマンドには Ephemeral でメッセージリンク付きで返信
                await interaction.reply({
                    content: `✅ リマインダーを更新しました！\n\n${changes.join("\n")}\n\n🔗 [リマインダーを表示](${messageLink})`,
                    flags: MessageFlags.Ephemeral,
                });
            }
        } catch (error) {
            // メッセージが削除されている等のエラーは無視
            console.error("Failed to update original message:", error);
            
            // エラー時は通常のリプライ
            await interaction.reply({
                content: `✅ リマインダーを更新しました！\n\n${changes.join("\n")}\n\n🆔 ID: \`${id}\``,
                flags: MessageFlags.Ephemeral,
            });
        }
    } else {
        console.log(
            `[DEBUG] replyMessageId or replyChannelId not found for reminder ${id}`,
            {
                replyMessageId: updated.replyMessageId,
                replyChannelId: updated.replyChannelId,
            },
        );
        
        // 元メッセージが見つからない場合は通常のリプライ
        await interaction.reply({
            content: `✅ リマインダーを更新しました！\n\n${changes.join("\n")}\n\n🆔 ID: \`${id}\``,
            flags: MessageFlags.Ephemeral,
        });
    }
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
export function cancelReminder(
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

