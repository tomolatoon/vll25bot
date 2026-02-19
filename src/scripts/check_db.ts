import { db } from "@db/client";
import type { Reminder } from "@db/types";
import { logger } from "@utils/logger";

type ReminderRow = Reminder;

logger.info("🔍 データベースの内容を確認します...");

try {
    const count = db.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM reminders",
    );
    logger.info(`📊 登録総数: ${count?.count ?? 0} 件`);

    const reminders = db.query<ReminderRow>(
        "SELECT * FROM reminders ORDER BY remindAt ASC",
    );

    if (reminders.length > 0) {
        logger.info("\n📋 リマインダー一覧:");
        for (const r of reminders) {
            const date = new Date(r.remindAt).toLocaleString("ja-JP");
            logger.info(
                `[${date}] ID:${r.id.substring(0, 8)}... Channel:${r.channelId} User:${r.createdBy}`,
            );
            logger.info(`   Message: ${r.message}`);
        }
    } else {
        logger.info("\n(リマインダーはありません)");
    }
} catch (e) {
    logger.error("❌ エラーが発生しました:", e);
}
