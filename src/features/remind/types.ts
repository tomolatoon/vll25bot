export interface Reminder {
    id: string;
    channelId: string;
    message: string;
    remindAt: number; // Unixタイムスタンプ (ミリ秒)
    createdAt: number; // Unixタイムスタンプ (ミリ秒)
    createdBy: string;
    guildId: string;
    replyMessageId?: string | null;
    replyChannelId?: string | null;
}

export type ReminderData = Omit<Reminder, "id" | "createdAt">;

export interface FilterOptions {
    channelId?: string;
    guildId?: string;
    minRemindAt?: number;
    maxRemindAt?: number;
}
