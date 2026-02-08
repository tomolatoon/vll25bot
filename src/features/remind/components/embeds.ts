import { EmbedBuilder } from "discord.js";
import {
    REMIND_COLOR_ERROR,
    REMIND_COLOR_INFO,
    REMIND_COLOR_SUCCESS,
    REMIND_COLOR_WARN,
} from "../constants";
import type { Reminder } from "../types";
import type { ListState } from "../utils/list";

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
 * キャンセル済みのリマインダーEmbedを生成
 */
export function buildCancelEmbed(reminder: Reminder): EmbedBuilder {
    const remindAt = new Date(reminder.remindAt);
    const unixTime = Math.floor(remindAt.getTime() / 1000);

    return new EmbedBuilder()
        .setColor(REMIND_COLOR_ERROR)
        .setTitle("🗑️ このリマインダーは解除されました")
        .setDescription(`${reminder.message}`)
        .addFields({
            name: "📅 日時",
            value: `<t:${unixTime}:S>`,
            inline: true,
        })
        .addFields({
            name: "📢 チャンネル",
            value: `<#${reminder.channelId}>`,
            inline: true,
        });
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
