import { describe, expect, test, beforeAll, setSystemTime } from "bun:test";
import { parseFutureDateTime } from "../src/lib/parser/date-parser";

describe("date-parser", () => {
    // 固定時刻: 2026-01-15 10:00:00
    const NOW = new Date("2026-01-15T10:00:00");

    beforeAll(() => {
        setSystemTime(NOW);
    });

    test("HH:MM - 今日の未来時刻", () => {
        // 今日 12:00
        const result = parseFutureDateTime("12:00");
        expect(result).toEqual(new Date("2026-01-15T12:00:00"));
    });

    test("HH:MM - 今日の過去時刻 (明日になるべき)", () => {
        // 今日 09:00 -> 明日 09:00
        const result = parseFutureDateTime("09:00");
        expect(result).toEqual(new Date("2026-01-16T09:00:00"));
    });

    test("YYYY/MM/DD HH:MM", () => {
        const result = parseFutureDateTime("2026/02/01 10:00");
        expect(result).toEqual(new Date("2026-02-01T10:00:00"));
    });

    test("MM/DD HH:MM - 未来の日付", () => {
        // 2/1 10:00 (今年)
        const result = parseFutureDateTime("02/01 10:00");
        expect(result).toEqual(new Date("2026-02-01T10:00:00"));
    });

    test("MM/DD HH:MM - 過去の日付 (来年になるべき)", () => {
        // 1/1 10:00 (過去) -> 来年
        const result = parseFutureDateTime("01/01 10:00");
        expect(result).toEqual(new Date("2027-01-01T10:00:00"));
    });

    test("日本語形式: YYYY年MM月DD日 HH:MM", () => {
        const result = parseFutureDateTime("2026年3月3日 15:00");
        expect(result).toEqual(new Date("2026-03-03T15:00:00"));
    });

    test("相対時間: 10分後", () => {
        const result = parseFutureDateTime("10分後");
        // 10:00 + 10分 = 10:10
        expect(result).toEqual(new Date("2026-01-15T10:10:00"));
    });

    test("相対時間: 1時間後", () => {
        const result = parseFutureDateTime("1時間後");
        // 10:00 + 1時間 = 11:00
        expect(result).toEqual(new Date("2026-01-15T11:00:00"));
    });

    test("相対日キーワード: 明日 HH:MM", () => {
        const result = parseFutureDateTime("明日 09:00");
        // 1/16 09:00
        expect(result).toEqual(new Date("2026-01-16T09:00:00"));
    });

    test("曜日指定: 金曜日 20:00", () => {
        // 2026-01-15 は木曜日。金曜日は 1/16。
        const result = parseFutureDateTime("金曜日 20:00");
        expect(result).toEqual(new Date("2026-01-16T20:00:00"));
    });

    test("曜日指定: 木曜日 09:00 (今日の過去時刻)", () => {
        // 今日は木曜日 10:00。木曜日 09:00 は過去。
        // 来週の木曜日になるべき。
        // weekday() ロジックの確認: `(targetDay - currentDay + 7) % 7 || 7`
        // (4 - 4 + 7) % 7 = 0. || 7 returns 7.
        // つまり、必ず7日後（来週）になる。
        
        const result = parseFutureDateTime("木曜日 09:00");
        expect(result).toEqual(new Date("2026-01-22T09:00:00"));
    });
});
