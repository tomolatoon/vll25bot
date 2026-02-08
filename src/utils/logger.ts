import fs from "node:fs";
import path from "node:path";

/**
 * ログレベル定義
 */
type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

/**
 * カスタムロガークラス
 * コンソール出力には色と時刻を付け、同時にファイルにも記録する
 */
class Logger {
    private logFilePath: string;

    constructor() {
        const logsDir = path.join(process.cwd(), "logs");
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        const now = new Date();
        const timestamp = now
            .toLocaleString("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            })
            .replace(/\//g, "-")
            .replace(/:/g, "-")
            .replace(/\s+/g, "_");
        this.logFilePath = path.join(logsDir, `app_${timestamp}.log`);

        this.log(`ログ出力を開始します: ${this.logFilePath}`);
    }

    /**
     * 現在時刻の文字列を取得
     */
    private getTimestamp(): string {
        const now = new Date();
        return now.toLocaleString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }

    /**
     * ログファイルへの書き込み
     */
    private writeToFile(message: string) {
        fs.appendFile(this.logFilePath, `${message}\n`, (err) => {
            if (err) {
                console.error("ログファイルへの書き込みに失敗しました:\n", err);
            }
        });
    }

    /**
     * 共通ログ出力処理
     */
    private print(level: LogLevel, message: string, ...args: unknown[]) {
        const timestamp = this.getTimestamp();
        const formattedMessage = `[${timestamp}] [${level}] ${message}`;

        // ファイル書き込み用メッセージ (引数もJSON化して記録)
        let fileMessage = formattedMessage;
        if (args.length > 0) {
            fileMessage += ` ${args
                .map((arg) =>
                    typeof arg === "object"
                        ? arg instanceof Error
                            ? `${arg.name}: ${arg.message}\n${arg.stack}`
                            : JSON.stringify(arg)
                        : String(arg),
                )
                .join(" ")}`;
        }
        this.writeToFile(fileMessage);

        // コンソール出力用 (色はここで付ける)
        let consoleMethod = console.log;
        let colorCode = "\x1b[37m"; // White

        switch (level) {
            case "INFO":
                colorCode = "\x1b[36m"; // Cyan
                consoleMethod = console.log;
                break;
            case "WARN":
                colorCode = "\x1b[33m"; // Yellow
                consoleMethod = console.warn;
                break;
            case "ERROR":
                colorCode = "\x1b[31m"; // Red
                consoleMethod = console.error;
                break;
            case "DEBUG":
                colorCode = "\x1b[90m"; // Gray
                consoleMethod = console.debug;
                break;
        }

        // 引数がある場合はそれも出力
        consoleMethod(`${colorCode}${formattedMessage}\x1b[0m`, ...args);
    }

    public log(message: string, ...args: unknown[]) {
        this.print("INFO", message, ...args);
    }

    public info(message: string, ...args: unknown[]) {
        this.print("INFO", message, ...args);
    }

    public warn(message: string, ...args: unknown[]) {
        this.print("WARN", message, ...args);
    }

    public error(message: string, ...args: unknown[]) {
        this.print("ERROR", message, ...args);
    }

    public debug(message: string, ...args: unknown[]) {
        this.print("DEBUG", message, ...args);
    }
}

// シングルトンインスタンスをエクスポート
export const logger = new Logger();
