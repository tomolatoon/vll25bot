/**
 * date-parser.ts - 日時解析パーサ
 */

import {
    type Parser,
    type ParserInput,
    cat,
    char,
    eof,
    integer,
    map,
    opt,
    or,
    rep,
    str,
} from "./combinator";

// ============================================================================
// 型定義とヘルパー
// ============================================================================

/** 日時コンポーネント */
export type DateTimeComponents = {
    year: number | null;
    month: number | null;
    day: number | null;
    hour: number | null;
    minute: number | null;
    second: number | null;
};

/** 空の DateTimeComponents */
const emptyComponents: DateTimeComponents = {
    year: null,
    month: null,
    day: null,
    hour: null,
    minute: null,
    second: null,
} as const;

/** DateTimeComponents を生成するヘルパー */
const components = (
    overrides: Partial<DateTimeComponents>,
): DateTimeComponents => ({ ...emptyComponents, ...overrides });

/** 2つの DateTimeComponents をマージ (後者の非null値で上書き) */
const mergeComponents = (
    a: DateTimeComponents,
    b: DateTimeComponents,
): DateTimeComponents => ({
    year: b.year ?? a.year,
    month: b.month ?? a.month,
    day: b.day ?? a.day,
    hour: b.hour ?? a.hour,
    minute: b.minute ?? a.minute,
    second: b.second ?? a.second,
});

/** DateTimeComponents から Date を生成 (不足分は now から補完) */
const componentsToDate = (c: DateTimeComponents, now: Date): Date =>
    new Date(
        c.year ?? now.getFullYear(),
        (c.month ?? now.getMonth() + 1) - 1,
        c.day ?? now.getDate(),
        c.hour ?? 0,
        c.minute ?? 0,
        c.second ?? 0,
    );

/** Date から DateTimeComponents を生成 */
const dateToComponents = (d: Date): DateTimeComponents => ({
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    second: d.getSeconds(),
});

/** Date に相対的な日数を加算した DateTimeComponents を生成 */
const relativeDayComponents = (now: Date, days: number): DateTimeComponents => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return components({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
    });
};

// ============================================================================
// 基本パーサ
// ============================================================================

/** 日付区切り文字 */
const dateSep: Parser<string> = or([char("/"), char("-")]);

/** 空白 (1文字以上) */
const sp: Parser<unknown> = rep(or([char(" "), char("　"), char("\t")]), 1);

/** 時間: "HH:MM" */
const time: Parser<DateTimeComponents> = map(
    cat([integer, char(":"), integer]),
    ([h, , m]) => components({ hour: h, minute: m }),
);

/** 年月日: "YYYY/MM/DD" or "YYYY-MM-DD" */
const fullDate: Parser<DateTimeComponents> = map(
    cat([integer, dateSep, integer, dateSep, integer]),
    ([y, , m, , d]) => components({ year: y, month: m, day: d }),
);

/** 月日: "M/D" or "M-D" */
const shortDate: Parser<DateTimeComponents> = map(
    cat([integer, dateSep, integer]),
    ([m, , d]) => components({ month: m, day: d }),
);

/** 日本語月日: "M月D日" */
const jpDate: Parser<DateTimeComponents> = map(
    cat([integer, str("月"), integer, str("日")]),
    ([m, , d]) => components({ month: m, day: d }),
);

/** 日本語年月日: "Y年M月D日" */
const jpFullDate: Parser<DateTimeComponents> = map(
    cat([integer, str("年"), integer, str("月"), integer, str("日")]),
    ([y, , m, , d]) => components({ year: y, month: m, day: d }),
);

/** 日のみ: "D日" */
const dayOnly: Parser<DateTimeComponents> = map(
    cat([integer, str("日")]),
    ([d]) => components({ day: d }),
);

/** 相対時間単位 */
type RelativeUnit = "分" | "時間" | "日" | "年";
const relativeUnit: Parser<RelativeUnit> = or([
    str("時間"),
    str("分"),
    str("日"),
    str("年"),
]);

/** 相対時間: "N単位後" */
const relativeTime = (now: Date): Parser<DateTimeComponents> =>
    map(cat([integer, relativeUnit, str("後")]), ([n, unit]) => {
        const d = new Date(now);
        const ops: Record<RelativeUnit, () => void> = {
            分: () => d.setMinutes(d.getMinutes() + n),
            時間: () => d.setHours(d.getHours() + n),
            日: () => d.setDate(d.getDate() + n),
            年: () => d.setFullYear(d.getFullYear() + n),
        };
        ops[unit]();
        return dateToComponents(d);
    });

/** 相対日キーワード: "今日", "明日", "明後日" */
const relativeDay = (now: Date): Parser<DateTimeComponents> =>
    or([
        map(str("明後日"), () => relativeDayComponents(now, 2)),
        map(str("明日"), () => relativeDayComponents(now, 1)),
        map(str("今日"), () => relativeDayComponents(now, 0)),
    ]);

/** 曜日名から曜日番号 (0=日, 1=月, ..., 6=土) へのマッピング */
const weekdayMap: Record<string, number> = {
    日: 0,
    月: 1,
    火: 2,
    水: 3,
    木: 4,
    金: 5,
    土: 6,
};

/** 曜日パーサ: "月曜日", "火曜", "水" など */
const weekday = (now: Date): Parser<DateTimeComponents> => {
    const weekdayNames = or([
        str("日"),
        str("月"),
        str("火"),
        str("水"),
        str("木"),
        str("金"),
        str("土"),
    ]);
    const suffix = opt(or([str("曜日"), str("曜")]));

    return map(cat([weekdayNames, suffix]), ([name]) => {
        const targetDay = weekdayMap[name];
        const currentDay = now.getDay();
        // 次の該当曜日までの日数 (同じ曜日なら7日後)
        const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
        return relativeDayComponents(now, daysUntil);
    });
};

// ============================================================================
// 日付+時間の複合パーサ
// ============================================================================

/** 日付パーサと時間パーサを空白で結合 */
const dateTime = (
    dateParser: Parser<DateTimeComponents>,
): Parser<DateTimeComponents> =>
    map(cat([dateParser, sp, time]), ([d, , t]) => mergeComponents(d, t));

// ============================================================================
// 未来調整
// ============================================================================

type AdjustFn = (d: Date) => void;
const noAdjust: AdjustFn | null = null;
const adjustNextDay: AdjustFn = (d) => d.setDate(d.getDate() + 1);
const adjustNextMonth: AdjustFn = (d) => d.setMonth(d.getMonth() + 1);
const adjustNextYear: AdjustFn = (d) => d.setFullYear(d.getFullYear() + 1);

// ============================================================================
// メイン関数
// ============================================================================

/**
 * 日時文字列をパースし、未来の日時を返す
 *
 * 対応フォーマット:
 * - "2026-01-15 09:00" / "2026/01/15 09:00" (完全日時)
 * - "2026年1月15日 09:00" (日本語完全日時)
 * - "1/15 09:00" / "1-15 09:00" (月日 + 時間)
 * - "1月15日 09:00" (日本語月日 + 時間)
 * - "15日 09:00" (日 + 時間)
 * - "今日 18:00" / "明日 12:00" / "明後日 10:30"
 * - "月曜日 10:00" / "火曜 15:00" / "水 09:00" (曜日 + 時間)
 * - "09:00" (時間のみ)
 * - "30分後" / "1時間後" / "2日後" / "1年後" (相対時間)
 *
 * 過去の日時は次の適切な未来に自動調整される
 */
export function parseFutureDateTime(input: string): Date | null {
    const now = new Date();
    const chars = [...input.trim()];

    // [パーサ, 未来調整関数] のペア配列
    const parsers: [Parser<DateTimeComponents>, AdjustFn | null][] = [
        [map(cat([relativeTime(now), eof]), ([c]) => c), noAdjust],
        [map(cat([time, eof]), ([c]) => c), adjustNextDay],
        [map(cat([dateTime(dayOnly), eof]), ([c]) => c), adjustNextMonth],
        [map(cat([dateTime(jpDate), eof]), ([c]) => c), adjustNextYear],
        [map(cat([dateTime(shortDate), eof]), ([c]) => c), adjustNextYear],
        [map(cat([dateTime(relativeDay(now)), eof]), ([c]) => c), noAdjust],
        [map(cat([dateTime(weekday(now)), eof]), ([c]) => c), noAdjust],
        [map(cat([dateTime(fullDate), eof]), ([c]) => c), noAdjust],
        [map(cat([dateTime(jpFullDate), eof]), ([c]) => c), noAdjust],
    ];

    for (const [parser, adjust] of parsers) {
        const result = parser(chars);
        if (result.result === "success") {
            const date = componentsToDate(result.data, now);
            if (Number.isNaN(date.getTime())) continue;
            if (adjust && date <= now) adjust(date);
            return date;
        }
    }

    return null;
}
