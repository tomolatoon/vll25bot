export const RATE_LIMIT_DELAY_MS = 100;

/**
 * 指定したミリ秒だけ遅延する
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
