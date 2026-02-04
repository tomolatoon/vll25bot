/**
 * lib/reminder.ts - リマインダー更新に関する共通ロジック
 *
 * リマインダー編集機能で使用する共通関数を提供します。
 * バリデーション、日時処理、メッセージ生成などのデータ処理を担当し、
 * メッセージ送信ロジックは各ハンドラー（command/modal）に委譲します。
 */

import { EmbedBuilder, type TextChannel } from "discord.js";
import { REMIND_COLOR_SUCCESS, REMIND_COLOR_WARN } from "./remind-ui";
import {
    type ReminderData,
    cancelReminderTask,
    getReminderById,
} from "../reminder";
import { parseFutureDateTime } from "./parser/date-parser";

/**
 * バリデーション結果の型定義
 */
export type ValidationResult =
    | { success: true; reminder: ReminderData }
    | { success: false; error: string };

/**
 * 日時バリデーション結果の型定義
 */
export type DateTimeValidationResult =
    | { success: true; date: Date | undefined }
    | { success: false; error: string };

/**
 * リマインダー更新のバリデーション
 *
 * @param id リマインダーID
 * @param userId 実行ユーザーID
 * @param guildId ギルドID（オプション）
 * @returns バリデーション結果
 *
 * @事前条件 id, userId は空文字列でない
 * @事後条件 成功時: { success: true, reminder: ReminderData }
 * @事後条件 失敗時: { success: false, error: string }
 */
export function validateReminderForUpdate(
    id: string,
    userId: string,
    guildId?: string,
): ValidationResult {
    const reminder = getReminderById(id);

    if (!reminder) {
        return { success: false, error: "リマインダーが見つかりません。" };
    }

    // 権限チェック
    if (reminder.createdBy !== userId) {
        return {
            success: false,
            error: "自分が登録したリマインダーのみ編集できます。",
        };
    }

    // ギルドIDチェック（指定された場合）
    if (guildId && reminder.guildId !== guildId) {
        return {
            success: false,
            error: "このサーバーのリマインダーではありません。",
        };
    }

    return { success: true, reminder };
}

/**
 * 日時入力のバリデーション
 *
 * @param datetimeStr 日時文字列（undefined の場合はスキップ）
 * @returns バリデーション結果
 *
 * @事前条件 なし
 * @事後条件 成功時: { success: true, date: Date | undefined }
 * @事後条件 失敗時: { success: false, error: string }
 */
export function validateDateTimeInput(
    datetimeStr: string | undefined,
): DateTimeValidationResult {
    // undefined の場合はスキップ
    if (!datetimeStr) {
        return { success: true, date: undefined };
    }

    // 日時のパース
    const parsedDate = parseFutureDateTime(datetimeStr);
    if (!parsedDate) {
        return {
            success: false,
            error: "日時の形式を正しく入力してください。\n例: 2026/01/15 9:00, 明日 9:00, 1分後 など",
        };
    }

    // 過去の日時チェック
    if (parsedDate <= new Date()) {
        return { success: false, error: "未来の日時を指定してください。" };
    }

    return { success: true, date: parsedDate };
}

/**
 * 変更内容の配列を生成
 *
 * リマインダー更新時の変更内容を、ユーザーに表示するための
 * フォーマット済み文字列配列に変換します。
 *
 * 例: { message: "テスト", remindAt: new Date(...) }
 *   → ["📝 メッセージ: テスト", "📅 日時: 2026/01/15 9:00:00"]
 *
 * @param updates 更新内容
 * @returns 変更内容の文字列配列（絵文字付き）
 *
 * @事前条件 なし
 * @事後条件 変更内容をフォーマットした文字列配列を返す
 */
export function buildChangesArray(updates: {
    message?: string;
    remindAt?: Date;
    channel?: TextChannel;
}): string[] {
    const changes: string[] = [];

    if (updates.message) {
        changes.push(`📝 メッセージ: ${updates.message}`);
    }

    if (updates.remindAt) {
        changes.push(`📅 日時: ${updates.remindAt.toLocaleString("ja-JP")}`);
    }

    if (updates.channel) {
        changes.push(`📢 チャンネル: <#${updates.channel.id}>`);
    }

    return changes;
}

/**
 * リマインダー更新後の返信メッセージ内容を生成
 * @deprecated Embedの使用を推奨。{@link buildUpdateResponseEmbed}を使用してください。
 * @param updated 更新後のリマインダーデータ
 * @param changes 変更内容の配列
 * @returns 返信メッセージの内容
 */
export function buildUpdateResponseContent(
    updated: ReminderData,
    changes: string[],
): string {
    const baseMessage = `✅ リマインダーを更新しました！

${changes.join("\n")}

`;

    if (updated.replyMessageId && updated.replyChannelId) {
        const messageLink = `https://discord.com/channels/${updated.guildId}/${updated.replyChannelId}/${updated.replyMessageId}`;
        return `${baseMessage}🔗 [リマインダーを表示](${messageLink})`;
    }

    return `${baseMessage}🆔 ID: \`${updated.id}\`

🔗 リマインダー登録メッセージは見つかりませんでした
`;
}

/**
 * リマインダー更新後の返信Embedを生成
 *
 * @param updated 更新後のリマインダーデータ
 * @param changes 変更内容の配列
 * @returns EmbedBuilder
 */
export function buildUpdateResponseEmbed(
    updated: ReminderData,
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
        // 元メッセージが見つからない場合
        // 警告色にするか迷うが、更新成功は成功なのでSUCCESSのまま、
        // フッターなどで注記する形にするか、あるいはDescriptionに追記
        embed.setFooter({
            text: `ID: ${updated.id} (元メッセージが見つかりませんでした)`,
        });
    }

    // IDは確実にわかるようにフィールドに入れるか、フッターに入れる
    // remind-uiではフィールドに入れているので合わせるのが無難だが、
    // ここでは変更点を目立たせたいのでIDはフッターでも良いかも。
    // しかし統一感のためにフィールドに入れておく。
    if (!updated.replyMessageId || !updated.replyChannelId) {
        // リンクがない場合のみIDフィールドを明示的に出す（リンクがあれば飛べばわかる）
        // または常にIDは出しても良い
        // remind-ui.tsでは常にIDを出している
        // ここでも出しておこう
    }
    // 上記ロジックでフッターにIDを入れたので、ここではシンプルにする

    return embed;
}

/** リマインダー解除の結果 */
export type CancelReminderResult =
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

    const stopped = cancelReminderTask(id);
    if (!stopped) {
        return { success: false, reason: "already_done" };
    }

    return { success: true };
}
