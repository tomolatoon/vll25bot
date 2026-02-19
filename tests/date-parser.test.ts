import { describe, expect, test, beforeAll, setSystemTime } from "bun:test";
import { parseFutureDateTime } from "../src/lib/parser/date-parser";

describe("date-parser", () => {
    // 固定時刻: 2026-01-15 10:00:00 (木曜日)
    const NOW = new Date("2026-01-15T10:00:00");

    beforeAll(() => {
        setSystemTime(NOW);
    });

    // ============================================================================
    // 固定時刻 (FixedTime)
    // ============================================================================

    describe("固定時刻", () => {
        test("HH:MM - 今日の未来時刻", () => {
            const result = parseFutureDateTime("12:00");
            expect(result).toEqual(new Date("2026-01-15T12:00:00"));
        });

        test("HH:MM - 今日の過去時刻 (明日になるべき)", () => {
            const result = parseFutureDateTime("09:00");
            expect(result).toEqual(new Date("2026-01-16T09:00:00"));
        });

        test("HH:MM:SS - 秒まで指定", () => {
            const result = parseFutureDateTime("14:30:45");
            expect(result).toEqual(new Date("2026-01-15T14:30:45"));
        });
    });

    // ============================================================================
    // 固定日付 + 時刻 (FixedDate + FixedTime)
    // ============================================================================

    describe("固定日付 + 時刻", () => {
        test("YYYY/MM/DD HH:MM", () => {
            const result = parseFutureDateTime("2026/02/01 10:00");
            expect(result).toEqual(new Date("2026-02-01T10:00:00"));
        });

        test("YYYY-MM-DD HH:MM", () => {
            const result = parseFutureDateTime("2026-02-01 10:00");
            expect(result).toEqual(new Date("2026-02-01T10:00:00"));
        });

        test("MM/DD HH:MM - 未来の日付", () => {
            const result = parseFutureDateTime("02/01 10:00");
            expect(result).toEqual(new Date("2026-02-01T10:00:00"));
        });

        test("MM/DD HH:MM - 過去の日付 (来年になるべき)", () => {
            const result = parseFutureDateTime("01/01 10:00");
            expect(result).toEqual(new Date("2027-01-01T10:00:00"));
        });

        test("日本語形式: YYYY年MM月DD日 HH:MM", () => {
            const result = parseFutureDateTime("2026年3月3日 15:00");
            expect(result).toEqual(new Date("2026-03-03T15:00:00"));
        });

        test("日本語形式: MM月DD日 HH:MM", () => {
            const result = parseFutureDateTime("3月3日 15:00");
            expect(result).toEqual(new Date("2026-03-03T15:00:00"));
        });

        test("日本語形式: DD日 HH:MM - 未来の日", () => {
            const result = parseFutureDateTime("20日 10:00");
            expect(result).toEqual(new Date("2026-01-20T10:00:00"));
        });

        test("日本語形式: DD日 HH:MM - 過去の日 (来月になるべき)", () => {
            const result = parseFutureDateTime("10日 10:00");
            expect(result).toEqual(new Date("2026-02-10T10:00:00"));
        });
    });

    // ============================================================================
    // 日本語相対時刻 (JpRelativeTime)
    // ============================================================================

    describe("日本語相対時刻", () => {
        test("N分後", () => {
            const result = parseFutureDateTime("10分後");
            expect(result).toEqual(new Date("2026-01-15T10:10:00"));
        });

        test("N時間後", () => {
            const result = parseFutureDateTime("2時間後");
            expect(result).toEqual(new Date("2026-01-15T12:00:00"));
        });

        test("N秒後", () => {
            const result = parseFutureDateTime("30秒後");
            expect(result).toEqual(new Date("2026-01-15T10:00:30"));
        });

        test("N分間後 (間付き)", () => {
            const result = parseFutureDateTime("10分間後");
            expect(result).toEqual(new Date("2026-01-15T10:10:00"));
        });
    });

    // ============================================================================
    // 英語相対時刻 (EnRelativeTime)
    // ============================================================================

    describe("英語相対時刻", () => {
        test("N minutes later", () => {
            const result = parseFutureDateTime("10 minutes later");
            expect(result).toEqual(new Date("2026-01-15T10:10:00"));
        });

        test("N hours later", () => {
            const result = parseFutureDateTime("2 hours later");
            expect(result).toEqual(new Date("2026-01-15T12:00:00"));
        });

        test("N seconds later", () => {
            const result = parseFutureDateTime("30 seconds later");
            expect(result).toEqual(new Date("2026-01-15T10:00:30"));
        });

        test("N minute later (単数形)", () => {
            const result = parseFutureDateTime("1 minute later");
            expect(result).toEqual(new Date("2026-01-15T10:01:00"));
        });
    });

    // ============================================================================
    // 日本語相対日付 (JpRelativeDate)
    // ============================================================================

    describe("日本語相対日付キーワード", () => {
        test("今日", () => {
            const result = parseFutureDateTime("今日");
            expect(result).toEqual(new Date("2026-01-15T00:00:00"));
        });

        test("明日", () => {
            const result = parseFutureDateTime("明日");
            expect(result).toEqual(new Date("2026-01-16T00:00:00"));
        });

        test("明後日", () => {
            const result = parseFutureDateTime("明後日");
            expect(result).toEqual(new Date("2026-01-17T00:00:00"));
        });

        test("明々後日", () => {
            const result = parseFutureDateTime("明々後日");
            expect(result).toEqual(new Date("2026-01-18T00:00:00"));
        });

        test("今週", () => {
            const result = parseFutureDateTime("今週");
            expect(result).toEqual(new Date("2026-01-15T00:00:00"));
        });

        test("来週", () => {
            const result = parseFutureDateTime("来週");
            expect(result).toEqual(new Date("2026-01-22T00:00:00"));
        });

        test("再来週", () => {
            const result = parseFutureDateTime("再来週");
            expect(result).toEqual(new Date("2026-01-29T00:00:00"));
        });

        test("今月", () => {
            const result = parseFutureDateTime("今月");
            expect(result).toEqual(new Date("2026-01-15T00:00:00"));
        });

        test("来月", () => {
            const result = parseFutureDateTime("来月");
            expect(result).toEqual(new Date("2026-02-15T00:00:00"));
        });

        test("再来月", () => {
            const result = parseFutureDateTime("再来月");
            expect(result).toEqual(new Date("2026-03-15T00:00:00"));
        });

        test("今年", () => {
            const result = parseFutureDateTime("今年");
            expect(result).toEqual(new Date("2026-01-15T00:00:00"));
        });

        test("来年", () => {
            const result = parseFutureDateTime("来年");
            expect(result).toEqual(new Date("2027-01-15T00:00:00"));
        });

        test("再来年", () => {
            const result = parseFutureDateTime("再来年");
            expect(result).toEqual(new Date("2028-01-15T00:00:00"));
        });
    });

    describe("日本語相対日付 (数値形式)", () => {
        test("N日後", () => {
            const result = parseFutureDateTime("3日後");
            expect(result).toEqual(new Date("2026-01-18T00:00:00"));
        });

        test("N週後", () => {
            const result = parseFutureDateTime("2週後");
            expect(result).toEqual(new Date("2026-01-29T00:00:00"));
        });

        test("N週間後", () => {
            const result = parseFutureDateTime("2週間後");
            expect(result).toEqual(new Date("2026-01-29T00:00:00"));
        });

        test("Nヶ月後", () => {
            const result = parseFutureDateTime("3ヶ月後");
            expect(result).toEqual(new Date("2026-04-15T00:00:00"));
        });

        test("Nか月後", () => {
            const result = parseFutureDateTime("3か月後");
            expect(result).toEqual(new Date("2026-04-15T00:00:00"));
        });

        test("Nカ月後", () => {
            const result = parseFutureDateTime("3カ月後");
            expect(result).toEqual(new Date("2026-04-15T00:00:00"));
        });

        test("N年後", () => {
            const result = parseFutureDateTime("2年後");
            expect(result).toEqual(new Date("2028-01-15T00:00:00"));
        });
    });

    // ============================================================================
    // 英語相対日付 (EnRelativeDate)
    // ============================================================================

    describe("英語相対日付キーワード", () => {
        test("today", () => {
            const result = parseFutureDateTime("today");
            expect(result).toEqual(new Date("2026-01-15T00:00:00"));
        });

        test("tomorrow", () => {
            const result = parseFutureDateTime("tomorrow");
            expect(result).toEqual(new Date("2026-01-16T00:00:00"));
        });

        test("day after tomorrow", () => {
            const result = parseFutureDateTime("day after tomorrow");
            expect(result).toEqual(new Date("2026-01-17T00:00:00"));
        });

        test("this week", () => {
            const result = parseFutureDateTime("this week");
            expect(result).toEqual(new Date("2026-01-15T00:00:00"));
        });

        test("next week", () => {
            const result = parseFutureDateTime("next week");
            expect(result).toEqual(new Date("2026-01-22T00:00:00"));
        });

        test("week after next", () => {
            const result = parseFutureDateTime("week after next");
            expect(result).toEqual(new Date("2026-01-29T00:00:00"));
        });

        test("this month", () => {
            const result = parseFutureDateTime("this month");
            expect(result).toEqual(new Date("2026-01-15T00:00:00"));
        });

        test("next month", () => {
            const result = parseFutureDateTime("next month");
            expect(result).toEqual(new Date("2026-02-15T00:00:00"));
        });

        test("month after next", () => {
            const result = parseFutureDateTime("month after next");
            expect(result).toEqual(new Date("2026-03-15T00:00:00"));
        });

        test("this year", () => {
            const result = parseFutureDateTime("this year");
            expect(result).toEqual(new Date("2026-01-15T00:00:00"));
        });

        test("next year", () => {
            const result = parseFutureDateTime("next year");
            expect(result).toEqual(new Date("2027-01-15T00:00:00"));
        });

        test("year after next", () => {
            const result = parseFutureDateTime("year after next");
            expect(result).toEqual(new Date("2028-01-15T00:00:00"));
        });
    });

    describe("英語相対日付 (数値形式)", () => {
        test("N days later", () => {
            const result = parseFutureDateTime("3 days later");
            expect(result).toEqual(new Date("2026-01-18T00:00:00"));
        });

        test("N weeks later", () => {
            const result = parseFutureDateTime("2 weeks later");
            expect(result).toEqual(new Date("2026-01-29T00:00:00"));
        });

        test("N months later", () => {
            const result = parseFutureDateTime("3 months later");
            expect(result).toEqual(new Date("2026-04-15T00:00:00"));
        });

        test("N years later", () => {
            const result = parseFutureDateTime("2 years later");
            expect(result).toEqual(new Date("2028-01-15T00:00:00"));
        });

        test("1 day later (単数形)", () => {
            const result = parseFutureDateTime("1 day later");
            expect(result).toEqual(new Date("2026-01-16T00:00:00"));
        });
    });

    // ============================================================================
    // 日本語曜日 (JpWeekDay)
    // ============================================================================

    describe("日本語曜日", () => {
        // 2026-01-15 は木曜日
        test("金曜日 (明日)", () => {
            const result = parseFutureDateTime("金曜日");
            expect(result).toEqual(new Date("2026-01-16T00:00:00"));
        });

        test("金曜 (省略形)", () => {
            const result = parseFutureDateTime("金曜");
            expect(result).toEqual(new Date("2026-01-16T00:00:00"));
        });

        test("金 (最短形)", () => {
            const result = parseFutureDateTime("金");
            expect(result).toEqual(new Date("2026-01-16T00:00:00"));
        });

        test("木曜日 (今日と同じ -> 来週)", () => {
            const result = parseFutureDateTime("木曜日");
            expect(result).toEqual(new Date("2026-01-22T00:00:00"));
        });

        test("月曜日", () => {
            // 木曜日から月曜日まで: 4日後
            const result = parseFutureDateTime("月曜日");
            expect(result).toEqual(new Date("2026-01-19T00:00:00"));
        });
    });

    // ============================================================================
    // 英語曜日 (EnWeekDay)
    // ============================================================================

    describe("英語曜日", () => {
        // 2026-01-15 は木曜日 (Thursday)
        test("Friday (フルスペル)", () => {
            const result = parseFutureDateTime("Friday");
            expect(result).toEqual(new Date("2026-01-16T00:00:00"));
        });

        test("Fri (短縮形)", () => {
            const result = parseFutureDateTime("Fri");
            expect(result).toEqual(new Date("2026-01-16T00:00:00"));
        });

        test("Thursday (今日と同じ -> 来週)", () => {
            const result = parseFutureDateTime("Thursday");
            expect(result).toEqual(new Date("2026-01-22T00:00:00"));
        });

        test("Monday", () => {
            const result = parseFutureDateTime("Monday");
            expect(result).toEqual(new Date("2026-01-19T00:00:00"));
        });

        test("Wednesday (フルスペル)", () => {
            // 木曜日から水曜日まで: 6日後
            const result = parseFutureDateTime("Wednesday");
            expect(result).toEqual(new Date("2026-01-21T00:00:00"));
        });

        test("Wed (短縮形)", () => {
            const result = parseFutureDateTime("Wed");
            expect(result).toEqual(new Date("2026-01-21T00:00:00"));
        });
    });

    // ============================================================================
    // 相対日付 + 固定時刻
    // ============================================================================

    describe("相対日付 + 固定時刻", () => {
        test("明日 HH:MM", () => {
            const result = parseFutureDateTime("明日 09:00");
            expect(result).toEqual(new Date("2026-01-16T09:00:00"));
        });

        test("来週 HH:MM", () => {
            const result = parseFutureDateTime("来週 14:00");
            expect(result).toEqual(new Date("2026-01-22T14:00:00"));
        });

        test("tomorrow HH:MM", () => {
            const result = parseFutureDateTime("tomorrow 10:00");
            expect(result).toEqual(new Date("2026-01-16T10:00:00"));
        });

        test("Monday HH:MM", () => {
            const result = parseFutureDateTime("Monday 09:30");
            expect(result).toEqual(new Date("2026-01-19T09:30:00"));
        });

        test("金曜日 HH:MM", () => {
            const result = parseFutureDateTime("金曜日 20:00");
            expect(result).toEqual(new Date("2026-01-16T20:00:00"));
        });

        test("木曜日 HH:MM (今日の曜日)", () => {
            const result = parseFutureDateTime("木曜日 09:00");
            expect(result).toEqual(new Date("2026-01-22T09:00:00"));
        });
    });

    // ============================================================================
    // パース失敗ケース
    // ============================================================================

    describe("パース失敗", () => {
        test("無効な文字列", () => {
            const result = parseFutureDateTime("invalid");
            expect(result).toBeNull();
        });

        test("空文字列", () => {
            const result = parseFutureDateTime("");
            expect(result).toBeNull();
        });

        test("部分的にマッチする文字列", () => {
            const result = parseFutureDateTime("明日だよ");
            expect(result).toBeNull();
        });
    });
});
