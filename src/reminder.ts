/**
 * reminder.ts - リマインダー管理
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Client, TextChannel } from "discord.js";
import cron, { type ScheduledTask } from "node-cron";
import { v7 as uuidv7 } from "uuid";

/** リマインダーデータ */
export interface ReminderData {
    id: string;
    channelId: string;
    message: string;
    remindAt: string;
    createdBy: string;
    guildId: string;
}

/** リマインダーとタスクをまとめて管理 */
interface ReminderEntry {
    data: ReminderData;
    task: ScheduledTask;
}

const REMINDER_FILE = "./reminders.json";

class Reminder {
    private entries = new Map<string, ReminderEntry>();
    private client: Client | null = null;

    setClient(client: Client): void {
        this.client = client;
    }

    /** リマインダーを作成して登録 */
    create(
        channelId: string,
        message: string,
        remindAt: Date,
        createdBy: string,
        guildId: string,
    ): ReminderData | null {
        if (remindAt <= new Date()) return null;

        const data: ReminderData = {
            id: uuidv7(),
            channelId,
            message,
            remindAt: remindAt.toISOString(),
            createdBy,
            guildId,
        };

        return this.register(data) ? (this.save(), data) : null;
    }

    /** リマインダーを登録 */
    register(data: ReminderData): boolean {
        const date = new Date(data.remindAt);
        if (date <= new Date()) {
            console.log(`⏭️ 過去のリマインダーをスキップ: ${data.id}`);
            return false;
        }

        const task = cron.schedule(
            this.toCron(date),
            () => this.execute(data),
            { timezone: "Asia/Tokyo" },
        );

        this.entries.set(data.id, { data, task });
        console.log(
            `⏰ リマインダー登録: ${data.id} @ ${date.toLocaleString("ja-JP")}`,
        );
        return true;
    }

    /** リマインダーを停止・削除 */
    stop(id: string): boolean {
        const entry = this.entries.get(id);
        if (!entry) return false;

        entry.task.stop();
        this.entries.delete(id);
        this.save();
        return true;
    }

    /** 全リマインダー一覧を取得 */
    getAll(): ReminderData[] {
        return [...this.entries.values()].map((e) => e.data);
    }

    /** ギルドのリマインダー一覧を取得 */
    getByGuild(guildId: string): ReminderData[] {
        return [...this.entries.values()]
            .map((e) => e.data)
            .filter((d) => d.guildId === guildId);
    }

    /** IDでリマインダーを検索 */
    findById(id: string): ReminderData | undefined {
        return this.entries.get(id)?.data;
    }

    /** ファイルから復元 */
    restore(): number {
        const saved = this.load();
        let count = 0;
        for (const data of saved) {
            if (this.register(data)) count++;
        }
        this.save();
        console.log(`📂 ${count}/${saved.length}件のリマインダーを復元`);
        return count;
    }

    /** ファイルに保存 */
    save(): void {
        const data = [...this.entries.values()].map((e) => e.data);
        writeFileSync(REMINDER_FILE, JSON.stringify(data, null, 2));
        console.log(`💾 ${data.length}件のリマインダーを保存`);
    }

    /** 全タスクを停止 */
    stopAll(): void {
        for (const { task } of this.entries.values()) task.stop();
        this.entries.clear();
        console.log("🛑 全リマインダータスクを停止");
    }

    /** ギルドの全タスクを停止 */
    stopAllByGuild(guildId: string): number {
        const targets = this.getByGuild(guildId);
        for (const data of targets) {
            const entry = this.entries.get(data.id);
            if (entry) {
                entry.task.stop();
                this.entries.delete(data.id);
            }
        }
        if (targets.length > 0) this.save();
        console.log(`🛑 ギルドの${targets.length}件のリマインダーを停止`);
        return targets.length;
    }

    /** メッセージを送信 */
    private async execute(data: ReminderData): Promise<void> {
        if (!this.client) {
            console.error("❌ Discord クライアントが未設定");
            return;
        }

        try {
            const channel = (await this.client.channels.fetch(
                data.channelId,
            )) as TextChannel | null;

            if (channel) {
                await channel.send(data.message);
                console.log(`📤 送信完了: ${data.id} -> #${channel.name}`);
            } else {
                console.error(`❌ チャンネル未発見: ${data.channelId}`);
            }
        } catch (error) {
            console.error(`❌ 送信エラー (${data.id}):`, error);
        }

        this.stop(data.id);
    }

    /** ファイルから読み込み */
    private load(): ReminderData[] {
        if (!existsSync(REMINDER_FILE)) return [];
        try {
            return JSON.parse(readFileSync(REMINDER_FILE, "utf-8"));
        } catch (error) {
            console.error("❌ リマインダーファイル読み込みエラー:", error);
            return [];
        }
    }

    /** Date を cron 形式に変換 */
    private toCron(date: Date): string {
        return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
    }
}

// シングルトンインスタンス
const reminder = new Reminder();

// 外部公開用の関数
export const setClient = (client: Client) => reminder.setClient(client);
export const createReminder = reminder.create.bind(reminder);

export const getReminders = () => reminder.getAll();
export const getReminderById = reminder.findById.bind(reminder);
export const getRemindersByGuild = reminder.getByGuild.bind(reminder);

export const stopReminder = reminder.stop.bind(reminder);
export const stopReminders = () => reminder.stopAll();
export const stopRemindersByGuild = reminder.stopAllByGuild.bind(reminder);

export const saveReminders = () => reminder.save();
export const restoreReminders = () => reminder.restore();
