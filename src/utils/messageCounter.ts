import { TextChannel, ForumChannel, ThreadChannel, Message } from "discord.js";

/**
 * テキストチャンネル内のメッセージ数をカウントする
 */
export async function countMessagesInChannel(
  channel: TextChannel
): Promise<number> {
  let count = 0;
  let lastId: string | undefined;

  while (true) {
    const messages = await channel.messages.fetch({
      limit: 100,
      ...(lastId && { before: lastId }),
    });

    if (messages.size === 0) break;

    count += messages.size;
    lastId = messages.last()?.id;
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

  while (true) {
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
  }

  return count;
}
