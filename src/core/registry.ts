import type {
    ButtonHandler,
    Command,
    ModalHandler,
    SelectMenuHandler,
} from "@core/types";
import { logger } from "@utils/logger";
import { type Client, Collection } from "discord.js";

/**
 * フィーチャーのセットアップ関数の型
 * @precondition client が ready 状態であること
 * @postcondition フィーチャー固有の初期化処理が完了する
 */
export type FeatureSetup = (client: Client) => Promise<void>;

export class Registry {
    public readonly commands = new Collection<string, Command>();
    public readonly buttonHandlers = new Collection<string, ButtonHandler>();
    public readonly selectMenuHandlers = new Collection<
        string,
        SelectMenuHandler
    >();
    public readonly modalHandlers = new Collection<string, ModalHandler>();
    private readonly setupFns: FeatureSetup[] = [];

    public registerCommand(command: Command) {
        this.commands.set(command.data.name, command);
    }

    public registerButtonHandler(handler: ButtonHandler) {
        this.buttonHandlers.set(handler.idPrefix, handler);
    }

    public registerSelectMenuHandler(handler: SelectMenuHandler) {
        this.selectMenuHandlers.set(handler.idPrefix, handler);
    }

    public registerModalHandler(handler: ModalHandler) {
        this.modalHandlers.set(handler.idPrefix, handler);
    }

    /**
     * フィーチャーのセットアップ関数を登録する
     * @param fn - clientReady 時に実行されるセットアップ関数
     */
    public registerSetup(fn: FeatureSetup) {
        this.setupFns.push(fn);
    }

    /**
     * 登録済みの全セットアップ関数を順次実行する
     * @precondition client が ready 状態であること
     * @postcondition 全フィーチャーの初期化が完了する
     */
    public async runSetups(client: Client): Promise<void> {
        for (const fn of this.setupFns) {
            try {
                await fn(client);
            } catch (error) {
                logger.error("❌ フィーチャーセットアップエラー:", error);
                throw error;
            }
        }
    }

    /**
     * ハンドラーを解決する汎用メソッド
     * @param collection - ハンドラーのコレクション
     * @param customId - カスタムID
     * @returns ハンドラーと引数、見つからない場合は null
     */
    private resolveHandler<T extends { idPrefix: string }>(
        collection: Collection<string, T>,
        customId: string,
    ): { handler: T; args: string } | null {
        // "prefix:args" または "prefix" の形式で単純なプレフィックス一致を行う
        const parts = customId.split(":");
        const prefix = parts[0];
        const args = parts.slice(1).join(":");

        const handler = collection.get(prefix);
        if (handler) {
            return { handler, args };
        }

        // フォールバック: 前方一致（最長一致）
        let bestMatch: T | null = null;
        let bestLength = 0;

        for (const [key, h] of collection) {
            if (customId.startsWith(key)) {
                if (key.length > bestLength) {
                    bestMatch = h;
                    bestLength = key.length;
                }
            }
        }

        if (bestMatch) {
            return { handler: bestMatch, args: customId.slice(bestLength) };
        }

        return null;
    }

    public resolveButtonHandler(
        customId: string,
    ): { handler: ButtonHandler; args: string } | null {
        return this.resolveHandler(this.buttonHandlers, customId);
    }

    public resolveModalHandler(
        customId: string,
    ): { handler: ModalHandler; args: string } | null {
        return this.resolveHandler(this.modalHandlers, customId);
    }

    public resolveSelectMenuHandler(
        customId: string,
    ): { handler: SelectMenuHandler; args: string } | null {
        return this.resolveHandler(this.selectMenuHandlers, customId);
    }
}
