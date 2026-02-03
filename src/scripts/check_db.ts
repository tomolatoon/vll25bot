import { type ReminderRow, db } from "../db/client";

console.log("🔍 データベースの内容を確認します...");

try {
    const count = db.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM reminders",
    );
    console.log(`📊 登録総数: ${count?.count ?? 0} 件`);

    const reminders = db.query<ReminderRow>(
        "SELECT * FROM reminders ORDER BY remindAt ASC",
    );

    if (reminders.length > 0) {
        console.log("\n📋 リマインダー一覧:");
        for (const r of reminders) {
            const date = new Date(r.remindAt).toLocaleString("ja-JP");
            console.log(
                `[${date}] ID:${r.id.substring(0, 8)}... Channel:${r.channelId} User:${r.createdBy}`,
            );
            console.log(`   Message: ${r.message}`);
        }
    } else {
        console.log("\n(リマインダーはありません)");
    }
} catch (e) {
    console.error("❌ エラーが発生しました:", e);
}
