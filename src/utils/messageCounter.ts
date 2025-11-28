import { TextChannel, ForumChannel, ThreadChannel, Message, DiscordAPIError } from "discord.js";

const RATE_LIMIT_DELAY_MS = 100;

/**
 * レート制限を考慮した遅延処理
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * テキストチャンネル内のメッセージ数をカウントする
 */
export async function countMessagesInChannel(
  channel: TextChannel
): Promise<number> {
  let count = 0;
  let lastId: string | undefined;
  let retryCount = 0;
  const maxRetries = 3;

  while (true) {
    try {
      const messages = await channel.messages.fetch({
        limit: 100,
        ...(lastId && { before: lastId }),
      });

      if (messages.size === 0) break;

      count += messages.size;
      lastId = messages.last()?.id;
      retryCount = 0;

      await delay(RATE_LIMIT_DELAY_MS);
    } catch (error) {
      if (error instanceof DiscordAPIError && error.status === 429) {
        const retryAfter = (error as DiscordAPIError & { retryAfter?: number }).retryAfter ?? 1000;
        await delay(retryAfter);
        continue;
      }

      if (retryCount < maxRetries) {
        retryCount++;
        await delay(RATE_LIMIT_DELAY_MS * Math.pow(2, retryCount));
        continue;
      }

      throw error;
    }
  }

  return count;
}

/**
 * フォーラムチャンネル内のスレッド数をカウントする
 */
export async function countThreadsInForum(
  channel: ForumChannel
): Promise<{ activeCount: number; archivedCount: number; totalCount: number }> {
  const activeThreads = await channel.threads.fetchActive();
  const archivedThreads = await channel.threads.fetchArchived();

  const activeCount = activeThreads.threads.size;
  const archivedCount = archivedThreads.threads.size;
  const totalCount = activeCount + archivedCount;

  return { activeCount, archivedCount, totalCount };
}

/**
 * 特定ユーザーのメッセージ数をカウントする
 */
export async function countUserMessagesInChannel(
  channel: TextChannel | ThreadChannel,
  userId: string
): Promise<number> {
  let count = 0;
  let lastId: string | undefined;
  let retryCount = 0;
  const maxRetries = 3;

  while (true) {
    try {
      const messages = await channel.messages.fetch({
        limit: 100,
        ...(lastId && { before: lastId }),
      });

      if (messages.size === 0) break;

      const userMessages = messages.filter(
        (msg: Message) => msg.author.id === userId
      );
      count += userMessages.size;
      lastId = messages.last()?.id;
      retryCount = 0;

      await delay(RATE_LIMIT_DELAY_MS);
    } catch (error) {
      if (error instanceof DiscordAPIError && error.status === 429) {
        const retryAfter = (error as DiscordAPIError & { retryAfter?: number }).retryAfter ?? 1000;
        await delay(retryAfter);
        continue;
      }

      if (retryCount < maxRetries) {
        retryCount++;
        await delay(RATE_LIMIT_DELAY_MS * Math.pow(2, retryCount));
        continue;
      }

      throw error;
    }
  }

  return count;
}
