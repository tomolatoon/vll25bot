import { existsSync, readFileSync, renameSync } from "node:fs";
import { REMINDER_FILE_PATH } from "@/constants";
import { ReminderRepository } from "@db/repositories/reminder-repository";
import type { ReminderData } from "@db/types";
import { logger } from "@utils/logger";

export class MigrationService {
    public async restoreFromJson(): Promise<number> {
        if (!existsSync(REMINDER_FILE_PATH)) return 0;

        logger.info("📂 reminder.json をDBに変換中...");

        try {
            const content = readFileSync(REMINDER_FILE_PATH, "utf-8");
            const oldData = JSON.parse(content) as (ReminderData & {
                id: string;
                createdAt: string;
            })[];
            let count = 0;
            const now = Date.now();

            const repository = new ReminderRepository();

            for (const item of oldData) {
                const remindAt = new Date(item.remindAt).getTime();
                if (remindAt <= now) {
                    logger.info(`⏭️ 過去のリマインダーをスキップ: ${item.id}`);
                    continue;
                }

                await repository.create({
                    id: item.id,
                    channelId: item.channelId,
                    message: item.message,
                    remindAt: remindAt,
                    createdBy: item.createdBy,
                    guildId: item.guildId,
                    createdAt: item.createdAt
                        ? new Date(item.createdAt).getTime()
                        : now,
                    replyMessageId: item.replyMessageId ?? null,
                    replyChannelId: item.replyChannelId ?? null,
                    version: 0,
                });
                count++;
            }

            const migratedPath = `${REMINDER_FILE_PATH}.migrated`;
            renameSync(REMINDER_FILE_PATH, migratedPath);
            logger.info(
                `✅ ${count} 件のリマインダーを移行しました。古いファイルを ${migratedPath} にリベースしました。`,
            );

            return count;
        } catch (error) {
            logger.error("❌ 移行失敗:", error);
            return 0;
        }
    }
}

export const migrationService = new MigrationService();
