import { CustomClient } from "@core/client";
import { logger } from "@utils/logger";

// CustomClient のインスタンスを作成・初期化
const client = new CustomClient();

// メイン処理
const main = async () => {
    try {
        await client.init();
    } catch (error) {
        logger.error("❌ アプリケーションの起動に失敗しました:", error);
        process.exit(1);
    }
};

// Graceful shutdown
let isShuttingDown = false;
const shutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info("🛑 Botをシャットダウン中...");

    client.destroy().then(() => {
        logger.info("👋 オフラインになりました");
        process.exit(0);
    });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// 実行
main();
