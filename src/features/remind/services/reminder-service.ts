import { ReminderRepository } from "@db/repositories/reminder-repository";
import { ConcurrencyError } from "@db/errors";
import { logger } from "@utils/logger";
import type {
    ActionRowBuilder,
    Client,
    EmbedBuilder,
    MessageActionRowComponentBuilder,
    TextChannel,
} from "discord.js";
import {
    buildCancelledButtons,
    buildReminderButtons,
} from "../components/actions";
import {
    buildCancelEmbed,
    buildExecutedReminderEmbed,
    buildReminderEmbed,
} from "../components/embeds";
import {
    CHECK_INTERVAL_MS,
    INITIAL_CHECK_DELAY_MS,
    SCHEDULE_BUFFER_MS,
} from "../constants";
import type { Reminder, ReminderData } from "@db/types";

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

        this.checkInterval = setInterval(() => {
            this.checkReminders();
        }, CHECK_INTERVAL_MS);

        setTimeout(() => this.checkReminders(), INITIAL_CHECK_DELAY_MS);
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
                version: 0,
            });

            logger.info(
                `⏰ リマインダー作成完了: ${reminder.id} @ ${remindAt.toLocaleString("ja-JP")}`,
            );

            this.scheduleIfImminent(reminder);

            return reminder;
        } catch (error) {
            logger.error("❌ リマインダー作成失敗:", error);
            return null;
        }
    }

    /**
     * 元のReplyメッセージをembedとcomponentsで更新する
     */
    private async updateOriginalMessage(
        reminder: Reminder,
        embed: EmbedBuilder,
        components: ActionRowBuilder<MessageActionRowComponentBuilder>[],
    ): Promise<void> {
        if (
            !this.client ||
            !reminder.replyMessageId ||
            !reminder.replyChannelId
        ) {
            return;
        }

        try {
            const channel = await this.client.channels.fetch(
                reminder.replyChannelId,
            );
            if (channel?.isTextBased()) {
                const message = await channel.messages.fetch(
                    reminder.replyMessageId,
                );
                await message.edit({ embeds: [embed], components });
            }
        } catch (error) {
            // メッセージが見つからない場合などは無視
            logger.debug("元メッセージの更新に失敗（無視）:", error);
        }
    }

    private async updateOriginalMessageAsCancelled(
        reminder: Reminder,
    ): Promise<void> {
        await this.updateOriginalMessage(
            reminder,
            buildCancelEmbed(reminder),
            [buildCancelledButtons(reminder.id)],
        );
    }

    /**
     * スケジュールタスクをクリアする
     * @param id - リマインダーID
     */
    private clearScheduledTask(id: string): void {
        const timer = this.scheduledTasks.get(id);
        if (timer) {
            clearTimeout(timer);
            this.scheduledTasks.delete(id);
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

            // 既存のスケジュールタスクをクリア
            this.clearScheduledTask(id);

            // 更新を実行（更新後のオブジェクトが返される）
            const updated = await this.repository.update(id, updates);
            if (!updated) return null;

            // 再スケジュール
            if (updates.remindAt) {
                this.scheduleIfImminent(updated);
                logger.info(
                    `✏️ リマインダー更新: ${id} @ ${new Date(updated.remindAt).toLocaleString("ja-JP")}`,
                );
            }

            return updated;
        } catch (error) {
            // 楽観的ロック競合エラーは呼び出し元で処理するため再スロー
            if (error instanceof ConcurrencyError) {
                logger.warn(`⚠️ 競合検出: ${id} - ${error.message}`);
                throw error;
            }
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
            this.clearScheduledTask(id);

            await this.repository.delete(id);
            logger.info(`🗑️ リマインダー削除: ${id}`);

            // 元のメッセージを「キャンセル済み」に更新
            await this.updateOriginalMessageAsCancelled(reminder);

            return { success: true, reminder };
        } catch (error) {
            if (error instanceof ConcurrencyError) {
                logger.warn(`⚠️ キャンセル競合検出: ${id} - ${error.message}`);
                return { success: false, reason: "conflict" };
            }
            logger.error("❌ リマインダー解除失敗:", error);
            return { success: false, reason: "error" };
        }
    }

    // 強制キャンセル（管理者やタスク完了時など）
    private async forceCancel(id: string) {
        this.clearScheduledTask(id);
        await this.repository.delete(id);
    }

    /**
     * リマインダーを削除する（権限チェックなどは呼び出し元で行うこと）
     */
    public async delete(id: string): Promise<void> {
        const reminder = await this.repository.findById(id);
        await this.forceCancel(id);
        logger.info(`🗑️ リマインダーを削除しました: ${id}`);

        // 元のメッセージを「キャンセル済み」に更新
        if (reminder) {
            await this.updateOriginalMessageAsCancelled(reminder);
        }
    }

    private async checkReminders() {
        const now = Date.now();
        const threshold = now + CHECK_INTERVAL_MS + SCHEDULE_BUFFER_MS;

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
        if (reminder.remindAt <= now + CHECK_INTERVAL_MS + SCHEDULE_BUFFER_MS) {
            this.scheduleTask(reminder);
        }
    }
    public async updateOriginalMessageAsEdited(
        reminder: Reminder,
    ): Promise<void> {
        await this.updateOriginalMessage(
            reminder,
            buildReminderEmbed(reminder),
            [buildReminderButtons(reminder.id)],
        );
    }

    private scheduleTask(reminder: Reminder) {
        this.clearScheduledTask(reminder.id);

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
