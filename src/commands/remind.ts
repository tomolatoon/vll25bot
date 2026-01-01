/**
 * remind.ts - リマインダーコマンド
 *
 * 指定した日時にメッセージを自動送信します。
 */

import {
    SlashCommandBuilder,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    type ChatInputCommandInteraction,
    type ButtonInteraction,
    type TextChannel,
} from "discord.js";
import type { Command } from "../types";
import {
    createReminder,
    getReminderById,
    getRemindersByGuild,
    stopReminder,
} from "../reminder";
import { parseFutureDateTime } from "../utils";

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
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("datetime")
                        .setDescription(
                            "送信日時 (例: 2026/01/15 9:00, 明日 9:00, 1分後 など)"
                        )
                        .setRequired(true)
                )
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription(
                            "送信先チャンネル（省略で現在のチャンネル）"
                        )
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("list")
                .setDescription("チャンネルのリマインダーを表示します")
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription(
                            "表示するリマインダーの送信先チャンネル（省略で現在のチャンネル）"
                        )
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription(
                            "表示するリマインダーの作成者（省略で全員）"
                        )
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("list_all")
                .setDescription("ギルド内の自分のリマインダーを全て表示します")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("リマインダーを削除します")
                .addStringOption((option) =>
                    option
                        .setName("id")
                        .setDescription("削除するリマインダーのID")
                        .setRequired(true)
                )
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
    interaction: ChatInputCommandInteraction
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
            ephemeral: true,
        });
        return;
    }

    // 過去の日時チェック
    if (remindAt <= new Date()) {
        await interaction.reply({
            content: "❌ 未来の日時を指定してください。",
            ephemeral: true,
        });
        return;
    }

    // リマインダー作成
    const reminder = createReminder(
        targetChannel.id,
        message,
        remindAt,
        interaction.user.id,
        interaction.guildId!
    );

    if (!reminder) {
        await interaction.reply({
            content: "❌ リマインダーの登録に失敗しました。",
            ephemeral: true,
        });
        return;
    }

    // キャンセルボタンを作成
    const cancelButton = new ButtonBuilder()
        .setCustomId(`${BUTTON_ID_REMIND_CANCEL}:${reminder.id}`)
        .setLabel("登録解除")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(cancelButton);

    await interaction.reply({
        content:
            `✅ リマインダーを登録しました！\n\n` +
            `📅 **日時**: ${remindAt.toLocaleString("ja-JP")}\n` +
            `📝 **メッセージ**: ${message}\n` +
            `📢 **チャンネル**: <#${targetChannel.id}>\n` +
            `🆔 **ID**: \`${reminder.id}\``,
        components: [row],
        ephemeral: false,
    });
}

/** リマインダー一覧 (チャンネル指定) */
async function handleList(
    interaction: ChatInputCommandInteraction
): Promise<void> {
    const guildId = interaction.guildId!;
    const targetChannel =
        (interaction.options.getChannel("channel") as TextChannel | null) ||
        (interaction.channel as TextChannel);
    // user 省略時は全員のリマインダーを表示
    const targetUser = interaction.options.getUser("user");
    
    const reminders = getRemindersByGuild(guildId).filter(
        (r) => r.channelId === targetChannel.id && (targetUser === null || r.createdBy === targetUser.id)
    );

    // フィルター条件の説明テキストを作成
    const filterDesc = targetUser === null
        ? `<#${targetChannel.id}> の`
        : `<#${targetChannel.id}> の <@${targetUser.id}> が登録した`;

    if (reminders.length === 0) {
        await interaction.reply({
            content: `📭 ${filterDesc}リマインダーはありません。`,
            ephemeral: true,
        });
        return;
    }

    const list = reminders
        .map((r) => {
            const date = new Date(r.remindAt);
            return (
                `🆔 \`${r.id}\`\n` +
                `　📅 ${date.toLocaleString("ja-JP")}\n` +
                `　📝 ${r.message.length > 30 ? r.message.substring(0, 30) + "..." : r.message}`
            );
        })
        .join("\n\n");

    await interaction.reply({
        content: `📋 **${filterDesc}リマインダー（${reminders.length}件）**\n\n${list}`,
        ephemeral: true,
    });
}

/** リマインダー一覧 (ギルド全体) */
async function handleListAll(
    interaction: ChatInputCommandInteraction
): Promise<void> {
    const guildId = interaction.guildId!;
    const userId = interaction.user.id;
    
    const reminders = getRemindersByGuild(guildId).filter(
        (r) => r.createdBy === userId
    );

    if (reminders.length === 0) {
        await interaction.reply({
            content: `📭 このサーバーにあなたのリマインダーはありません。`,
            ephemeral: true,
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
                `　📝 ${r.message.length > 30 ? r.message.substring(0, 30) + "..." : r.message}`
            );
        })
        .join("\n\n");

    await interaction.reply({
        content: `📋 **あなたのリマインダー（${reminders.length}件）**\n\n${list}`,
        ephemeral: true,
    });
}

/** リマインダー削除 */
async function handleRemove(
    interaction: ChatInputCommandInteraction
): Promise<void> {
    const id = interaction.options.getString("id", true);

    // ギルド内のリマインダーのみ削除可能
    const reminder = getReminderById(id);

    if (!reminder || reminder.guildId !== interaction.guildId) {
        await interaction.reply({
            content: "❌ 指定されたIDのリマインダーがこのサーバーに見つかりません。",
            ephemeral: true,
        });
        return;
    }

    stopReminder(id);

    await interaction.reply({
        content: `🗑️ リマインダー \`${id}\` を解除しました。`,
        ephemeral: false,
    });
}

/** リマインダー解除ボタンの処理 */
export async function handleRemindCancelButton(
    interaction: ButtonInteraction,
    id: string
): Promise<void> {
    const success = stopReminder(id);

    if (success) {
        await interaction.update({
            content: `🗑️ リマインダー \`${id}\` を解除しました。`,
            components: [],
        });
    } else {
        await interaction.reply({
            content: "✅ 既に実行済みか解除済みです。",
            ephemeral: true,
        });
    }
}
