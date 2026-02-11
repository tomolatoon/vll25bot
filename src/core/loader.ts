import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Registry } from "@core/registry";
import { logger } from "@utils/logger";
import type {
    ButtonHandler,
    Command,
    ModalHandler,
    SelectMenuHandler,
} from "./types";

export class Loader {
    constructor(private registry: Registry) {}

    public async loadFeatures(featuresPath: string) {
        const featureDirs = readdirSync(featuresPath).filter((file) =>
            statSync(join(featuresPath, file)).isDirectory(),
        );

        for (const featureDir of featureDirs) {
            const featurePath = join(featuresPath, featureDir);
            await this.loadFeature(featurePath);
        }
    }

    private async loadFeature(featurePath: string) {
        // セットアップスクリプトの検出・登録
        const setupPath = join(featurePath, "setup.ts");
        if (this.exists(setupPath)) {
            try {
                const mod = await import(setupPath);
                const setupFn = mod.setup ?? mod.default?.setup ?? mod.default;
                if (typeof setupFn === "function") {
                    this.registry.registerSetup(setupFn);
                    logger.info("📂 セットアップを登録しました");
                }
            } catch (error) {
                logger.error(
                    `❌ セットアップの読み込みに失敗: ${setupPath}`,
                    error,
                );
            }
        }

        // コマンドの読み込み
        const commandsPath = join(featurePath, "commands");
        if (this.exists(commandsPath)) {
            await this.loadModules(commandsPath, (module) => {
                if (this.isCommand(module)) {
                    this.registry.registerCommand(module);
                    logger.info(
                        `📂 コマンドを読み込みました: ${module.data.name}`,
                    );
                }
            });
        }

        // ハンドラー（ボタン、モーダル、セレクトメニュー）の読み込み
        const handlersPath = join(featurePath, "handlers");
        if (this.exists(handlersPath)) {
            await this.loadModules(handlersPath, (module) => {
                const items = Array.isArray(module) ? module : [module];

                for (const item of items) {
                    if (!item) continue;

                    if (this.isButtonHandler(item)) {
                        this.registry.registerButtonHandler(item);
                        logger.info(
                            `📂 ボタンハンドラーを読み込みました: ${item.idPrefix}`,
                        );
                    } else if (this.isModalHandler(item)) {
                        this.registry.registerModalHandler(item);
                        logger.info(
                            `📂 モーダルハンドラーを読み込みました: ${item.idPrefix}`,
                        );
                    } else if (this.isSelectMenuHandler(item)) {
                        this.registry.registerSelectMenuHandler(item);
                        logger.info(
                            `📂 セレクトメニューハンドラーを読み込みました: ${item.idPrefix}`,
                        );
                    }
                }
            });
        }
    }

    private async loadModules(
        dirPath: string,
        callback: (module: unknown) => void,
    ) {
        const files = readdirSync(dirPath).filter(
            (file) => file.endsWith(".ts") || file.endsWith(".js"),
        );

        for (const file of files) {
            const filePath = join(dirPath, file);
            try {
                const module = await import(filePath);
                // デフォルトエクスポートを確認
                if (module.default) {
                    callback(module.default);
                } else {
                    // 必要であれば名前付きエクスポートも確認するが、ルールとしてデフォルトエクスポートを使用する
                }
            } catch (error) {
                logger.error(
                    `❌ モジュールの読み込みに失敗: ${filePath}`,
                    error,
                );
            }
        }
    }

    private exists(path: string): boolean {
        try {
            statSync(path);
            return true;
        } catch {
            return false;
        }
    }

    // 型ガード
    private isCommand(obj: unknown): obj is Command {
        return (
            typeof obj === "object" &&
            obj !== null &&
            "data" in obj &&
            "execute" in obj
        );
    }

    /**
     * ボタン、モーダル、セレクトメニューのインタラクションハンドラーの共通ベースチェック
     */
    private isInteractionHandler(obj: unknown): boolean {
        return (
            typeof obj === "object" &&
            obj !== null &&
            "idPrefix" in obj &&
            "execute" in obj &&
            "type" in obj
        );
    }

    private isButtonHandler(obj: unknown): obj is ButtonHandler {
        return (
            this.isInteractionHandler(obj) &&
            (obj as ButtonHandler).type === "BUTTON"
        );
    }

    private isModalHandler(obj: unknown): obj is ModalHandler {
        return (
            this.isInteractionHandler(obj) &&
            (obj as ModalHandler).type === "MODAL"
        );
    }

    private isSelectMenuHandler(obj: unknown): obj is SelectMenuHandler {
        return (
            this.isInteractionHandler(obj) &&
            (obj as SelectMenuHandler).type === "SELECT"
        );
    }
}
