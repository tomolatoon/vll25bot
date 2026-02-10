import { ReminderRepository } from "@db/repositories/reminder-repository";
import { logger } from "@utils/logger";
import type { Client, TextChannel } from "discord.js";
import { buildExecutedReminderEmbed } from "../components/embeds";
import type { Reminder, ReminderData } from "../types";

export class ReminderService {
    private static instance: ReminderService;
    private client: Client | null = null;
    private checkInterval: ReturnType<typeof setInterval> | null = null;
    private scheduledTasks = new Map<string, ReturnType<typeof setTimeout>>();
    private repository: ReminderRepository;

    private constructor() {
        this.repository = new ReminderRepository();
    }

    public static getInstance(): ReminderService {
        if (!ReminderService.instance) {
            ReminderService.instance = new ReminderService();
        }
        return ReminderService.instance;
    }

    public setClient(client: Client) {
        this.client = client;
        this.startScheduler();
    }

    private startScheduler() {
        if (this.checkInterval) clearInterval(this.checkInterval);

        if (this.checkInterval) clearInterval(this.checkInterval);

        // 1分ごとにチェック
        this.checkInterval = setInterval(() => {
            this.checkReminders();
        }, 60 * 1000);

        // 初回チェック
        setTimeout(() => this.checkReminders(), 1000);
    }

    public async create(
        channelId: string,
        message: string,
        remindAt: Date,
        createdBy: string,
        guildId: string,
        options: { replyMessageId?: string; replyChannelId?: string } = {},
    ): Promise<Reminder | null> {
        if (remindAt <= new Date()) return null;

        try {
            const reminder = await this.repository.create({
                channelId,
                message,
                remindAt: remindAt.getTime(),
                createdBy,
                guildId,
                replyMessageId: options.replyMessageId,
                replyChannelId: options.replyChannelId,
            });

            logger.info(
                `⏰ リマインダー作成完了: ${reminder.id} @ ${remindAt.toLocaleString("ja-JP")}`,
            );

            this.scheduleIfImminent(reminder);

            return reminder;
        } catch (error) {
            logger.error("❌ Failed to create reminder:", error);
            return null;
        }
    }

    public async update(
        id: string,
        updates: Partial<ReminderData>,
    ): Promise<Reminder | null> {
        try {
            const existing = await this.repository.findById(id);
            if (!existing) return null;

            // remindAtを更新する場合、過去の日時でないか検証
            if (updates.remindAt && updates.remindAt <= Date.now()) {
                logger.error("❌ 過去の日時には更新できません");
                return null;
            }

            await this.repository.update(id, updates);

            // 完全なオブジェクトを返し、再スケジュールするために更新後のリマインダーを取得
            const updated = await this.repository.findById(id);
            if (!updated) return null; // 発生しないはず

            // 再スケジュール
            if (updates.remindAt) {
                if (this.scheduledTasks.has(id)) {
                    clearTimeout(this.scheduledTasks.get(id));
                    this.scheduledTasks.delete(id);
                }
                this.scheduleIfImminent(updated);
                logger.info(
                    `✏️ リマインダー更新: ${id} @ ${new Date(updated.remindAt).toLocaleString("ja-JP")}`,
                );
            }

            return updated;
        } catch (error) {
            logger.error("❌ リマインダー更新失敗:", error);
            return null;
        }
    }

    public async cancel(
        id: string,
        userId: string,
        guildId?: string,
    ): Promise<
        | { success: true; reminder: Reminder }
        | { success: false; reason: string }
    > {
        try {
            const reminder = await this.repository.findById(id);
            if (!reminder) return { success: false, reason: "not_found" };

            if (guildId && reminder.guildId !== guildId) {
                return { success: false, reason: "wrong_guild" };
            }
            if (reminder.createdBy !== userId) {
                return { success: false, reason: "not_owner" };
            }

            // メモリから削除
            if (this.scheduledTasks.has(id)) {
                clearTimeout(this.scheduledTasks.get(id));
                this.scheduledTasks.delete(id);
            }

            await this.repository.delete(id);
            logger.info(`🗑️ リマインダー削除: ${id}`);
            return { success: true, reminder };
        } catch (error) {
            logger.error("❌ リマインダー解除失敗:", error);
            // falseを返すべきか、例外を投げるべきか？ 既存ロジックはboolean/resultを返していた
            return { success: false, reason: "error" };
        }
    }

    // 強制キャンセル（管理者やタスク完了時など）
    private async forceCancel(id: string) {
        if (this.scheduledTasks.has(id)) {
            clearTimeout(this.scheduledTasks.get(id));
            this.scheduledTasks.delete(id);
        }
        await this.repository.delete(id);
    }

    /**
     * リマインダーを削除する（権限チェックなどは呼び出し元で行うこと）
     */
    public async delete(id: string): Promise<void> {
        await this.forceCancel(id);
        logger.info(`🗑️ リマインダーを削除しました: ${id}`);
    }

    private async checkReminders() {
        const now = Date.now();
        const threshold = now + 70 * 1000; // 70秒のバッファ

        try {
            const tasks = await this.repository.findAll({
                maxRemindAt: threshold,
            });

            let scheduledCount = 0;
            for (const task of tasks) {
                if (this.scheduledTasks.has(task.id)) continue;
                this.scheduleTask(task);
                scheduledCount++;
            }

            if (scheduledCount > 0) {
                logger.info(
                    `🔄 メモリに ${scheduledCount} 件のリマインダーをスケジュールしました`,
                );
            }
        } catch (error) {
            logger.error("❌ リマインダーチェックエラー:", error);
        }
    }

    private scheduleIfImminent(reminder: Reminder) {
        const now = Date.now();
        if (reminder.remindAt <= now + 70 * 1000) {
            this.scheduleTask(reminder);
        }
    }

    private scheduleTask(reminder: Reminder) {
        if (this.scheduledTasks.has(reminder.id)) {
            clearTimeout(this.scheduledTasks.get(reminder.id));
        }

        const now = Date.now();
        const delay = Math.max(0, reminder.remindAt - now);

        const timer = setTimeout(() => {
            this.scheduledTasks.delete(reminder.id);
            this.execute(reminder);
        }, delay);

        this.scheduledTasks.set(reminder.id, timer);
    }

    private async execute(reminder: Reminder) {
        if (!this.client) {
            logger.error("❌ Discord Clientが設定されていません");
            return;
        }

        // 再取得して、存在し変更されていないことを確認
        const fresh = await this.repository.findById(reminder.id);
        if (!fresh) {
            logger.warn(
                `⚠️ リマインダー ${reminder.id} が見つかりません (削除済み?)`,
            );
            return;
        }

        try {
            const channel = (await this.client.channels.fetch(
                fresh.channelId,
            )) as TextChannel | null;
            if (channel) {
                await channel.send(fresh.message);
                logger.info(
                    `📤 リマインダー送信: ${fresh.id} -> #${channel.name}`,
                );

                // 元のメッセージを更新
                if (fresh.replyMessageId && fresh.replyChannelId) {
                    try {
                        const replyChannel = (await this.client.channels.fetch(
                            fresh.replyChannelId,
                        )) as TextChannel | null;
                        if (replyChannel) {
                            const replyMessage =
                                await replyChannel.messages.fetch(
                                    fresh.replyMessageId,
                                );
                            await replyMessage.edit({
                                embeds: [buildExecutedReminderEmbed(fresh)],
                                components: [],
                            });
                        }
                    } catch (ignore) {
                        // 元メッセージが見つからない、権限がないなどの場合は無視
                    }
                }
            } else {
                logger.error(
                    `❌ チャンネルが見つかりません: ${fresh.channelId}`,
                );
            }
        } catch (error) {
            logger.error(`❌ 送信エラー (${fresh.id}):`, error);
        }

        // 実行後にDBから削除
        await this.forceCancel(fresh.id);
    }

    public async getReminderById(id: string): Promise<Reminder | null> {
        return this.repository.findById(id);
    }

    public async getByGuild(guildId: string): Promise<Reminder[]> {
        return this.repository.findAll({ guildId });
    }
}

export const reminderService = ReminderService.getInstance();
