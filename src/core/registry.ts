import { Collection } from "discord.js";
import type {
    ButtonHandler,
    Command,
    ModalHandler,
    SelectMenuHandler,
} from "./types";

export class Registry {
    public readonly commands = new Collection<string, Command>();
    public readonly buttonHandlers = new Collection<string, ButtonHandler>();
    public readonly selectMenuHandlers = new Collection<
        string,
        SelectMenuHandler
    >();
    public readonly modalHandlers = new Collection<string, ModalHandler>();

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

    public resolveButtonHandler(
        customId: string,
    ): { handler: ButtonHandler; args: string } | null {
        // "prefix:args" または "prefix" の形式で単純なプレフィックス一致を行う
        const parts = customId.split(":");
        const prefix = parts[0];
        const args = parts.slice(1).join(":");

        const handler = this.buttonHandlers.get(prefix);
        if (handler) {
            return { handler, args };
        }

        // フォールバック: 前方一致（最長一致）
        let bestMatch: ButtonHandler | null = null;
        let bestLength = 0;

        for (const [key, h] of this.buttonHandlers) {
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

    public resolveModalHandler(
        customId: string,
    ): { handler: ModalHandler; args: string } | null {
        const parts = customId.split(":");
        const prefix = parts[0];
        const args = parts.slice(1).join(":");

        const handler = this.modalHandlers.get(prefix);
        if (handler) {
            return { handler, args };
        }

        let bestMatch: ModalHandler | null = null;
        let bestLength = 0;

        for (const [key, h] of this.modalHandlers) {
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

    public resolveSelectMenuHandler(
        customId: string,
    ): { handler: SelectMenuHandler; args: string } | null {
        const parts = customId.split(":");
        const prefix = parts[0];
        const args = parts.slice(1).join(":");

        const handler = this.selectMenuHandlers.get(prefix);
        if (handler) {
            return { handler, args };
        }

        let bestMatch: SelectMenuHandler | null = null;
        let bestLength = 0;

        for (const [key, h] of this.selectMenuHandlers) {
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
}
