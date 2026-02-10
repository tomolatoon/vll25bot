/**
 * forwardCleanup.ts - 転送メッセージのクリーンアップ処理
 *
 * 転送されたメッセージに付けられた🗑️リアクションを検出し、
 * そのメッセージを削除する機能を提供する
 */

import { logger } from "@utils/logger";
import type {
    Client,
    MessageReaction,
    PartialMessageReaction,
    PartialUser,
    User,
} from "discord.js";

/** 転送メッセージ削除用の絵文字 */
const DELETE_FORWARDED_MESSAGE_EMOJI = "🗑️";

/**
 * 転送メッセージのクリーンアップイベントハンドラーを登録する
 *
 * この関数は以下の条件を満たすメッセージを削除する：
 * - Bot が送信したメッセージである
 * - メッセージに MessageSnapshot がある（転送メッセージの証拠）
 * - 🗑️ リアクションが追加された
 * - リアクションを追加したのが Bot 自身ではない
 *
 * @param client - Discord クライアント
 */
export function registerForwardCleanupHandler(client: Client): void {
    client.on(
        "messageReactionAdd",
        async (
            reaction: MessageReaction | PartialMessageReaction,
            user: User | PartialUser,
        ) => {
            // Bot 自身のリアクションは無視（転送時に自分で追加したリアクションで消してしまうのを防ぐ）
            if (user.id === client.user?.id) {
                return;
            }

            // 正しい絵文字かチェック
            if (reaction.emoji.name !== DELETE_FORWARDED_MESSAGE_EMOJI) {
                return;
            }

            try {
                // Partial の場合はフェッチ
                const fetchedReaction = reaction.partial
                    ? await reaction.fetch()
                    : reaction;
                const message = fetchedReaction.message.partial
                    ? await fetchedReaction.message.fetch()
                    : fetchedReaction.message;

                // Bot が送信したメッセージでなければ無視
                if (message.author.id !== client.user?.id) {
                    return;
                }

                // MessageSnapshot がないメッセージは転送メッセージではないので無視
                // messageSnapshots は転送メッセージに付与されるプロパティ
                if (
                    !message.messageSnapshots ||
                    message.messageSnapshots.size === 0
                ) {
                    return;
                }

                // 転送メッセージを削除
                await message.delete();
                logger.info(
                    `🗑️ 転送メッセージを削除しました (ID: ${message.id})`,
                );
            } catch (error) {
                logger.error("転送メッセージの削除に失敗しました:\n", error);
            }
        },
    );
}
