/**
 * date-parser.ts - 日時解析パーサ
 *
 * EBNFに基づいた日時文字列のパーサーを提供する。
 * 日本語と英語の両方の構文をサポートしている。
 *
 * 文法定義は src/lib/parser/EBNF.txt を参照。
 */

import {
    type Parser,
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

// ============================================================================
// オフセット計算ヘルパー
// ============================================================================

/** Date に相対的な日数を加算した DateTimeComponents を生成 (日付のみ) */
const offsetDays = (now: Date, days: number): DateTimeComponents => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return components({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
    });
};

/** Date に相対的な週数を加算した DateTimeComponents を生成 (日付のみ) */
const offsetWeeks = (now: Date, weeks: number): DateTimeComponents =>
    offsetDays(now, weeks * 7);

/** Date に相対的な月数を加算した DateTimeComponents を生成 (日付のみ) */
const offsetMonths = (now: Date, months: number): DateTimeComponents => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + months);
    return components({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
    });
};

/** Date に相対的な年数を加算した DateTimeComponents を生成 (日付のみ) */
const offsetYears = (now: Date, years: number): DateTimeComponents => {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() + years);
    return components({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
    });
};

// ============================================================================
// 基本パーサ (Primitives)
// ============================================================================

/**
 * 日付区切り文字
 * <DateSep> ::= "/" | "-"
 */
const dateSep: Parser<string> = or([char("/"), char("-")]);

/** 空白 (1文字以上): " "+ */
const sp: Parser<unknown> = rep(or([char(" "), char("　"), char("\t")]), 1);

/** 空白 (0文字以上): " "* */
const optSp: Parser<unknown> = rep(or([char(" "), char("　"), char("\t")]), 0);

// ============================================================================
// 時刻 (ClockTime)
// <ClockTime> ::= <Integer> ":" <Integer> ":" <Integer>
//               | <Integer> ":" <Integer>
// ============================================================================

/** 時:分:秒 形式: "HH:MM:SS" */
const clockTimeHMS: Parser<DateTimeComponents> = map(
    cat([integer, char(":"), integer, char(":"), integer]),
    ([h, , m, , s]) => components({ hour: h, minute: m, second: s }),
);

/** 時:分 形式: "HH:MM" */
const clockTimeHM: Parser<DateTimeComponents> = map(
    cat([integer, char(":"), integer]),
    ([h, , m]) => components({ hour: h, minute: m, second: 0 }),
);

/**
 * 時計時刻パーサ
 * <ClockTime> ::= <Integer> ":" <Integer> ":" <Integer>
 *               | <Integer> ":" <Integer>
 */
const clockTime: Parser<DateTimeComponents> = or([clockTimeHMS, clockTimeHM]);

// ============================================================================
// 絶対日付 (AbsoluteDate)
// <AbsoluteDate> ::= <FullDate> | <MonthDay> | <DayOnly>
// ============================================================================

/**
 * 年月日 (区切り文字形式): "YYYY/MM/DD" or "YYYY-MM-DD"
 */
const fullDateSep: Parser<DateTimeComponents> = map(
    cat([integer, dateSep, integer, dateSep, integer]),
    ([y, , m, , d]) => components({ year: y, month: m, day: d }),
);

/**
 * 年月日 (日本語形式): "Y年M月D日"
 */
const fullDateJp: Parser<DateTimeComponents> = map(
    cat([integer, str("年"), integer, str("月"), integer, str("日")]),
    ([y, , m, , d]) => components({ year: y, month: m, day: d }),
);

/**
 * 年月日パーサ
 * <FullDate> ::= <Integer> <DateSep> <Integer> <DateSep> <Integer>
 *              | <Integer> "年" <Integer> "月" <Integer> "日"
 */
const fullDate: Parser<DateTimeComponents> = or([fullDateJp, fullDateSep]);

/**
 * 月日 (区切り文字形式): "M/D" or "M-D"
 */
const monthDaySep: Parser<DateTimeComponents> = map(
    cat([integer, dateSep, integer]),
    ([m, , d]) => components({ month: m, day: d }),
);

/**
 * 月日 (日本語形式): "M月D日"
 */
const monthDayJp: Parser<DateTimeComponents> = map(
    cat([integer, str("月"), integer, str("日")]),
    ([m, , d]) => components({ month: m, day: d }),
);

/**
 * 月日パーサ
 * <MonthDay> ::= <Integer> <DateSep> <Integer>
 *              | <Integer> "月" <Integer> "日"
 */
const monthDay: Parser<DateTimeComponents> = or([monthDayJp, monthDaySep]);

/**
 * 日のみ (日本語形式): "D日"
 */
const dayOnlyJp: Parser<DateTimeComponents> = map(
    cat([integer, str("日")]),
    ([d]) => components({ day: d }),
);

/**
 * 日のみ (数字のみ): "D"
 */
const dayOnlyNum: Parser<DateTimeComponents> = map(integer, (d) =>
    components({ day: d }),
);

/**
 * 日のみパーサ
 * <DayOnly> ::= <Integer> "日" | <Integer>
 */
const dayOnly: Parser<DateTimeComponents> = or([dayOnlyJp, dayOnlyNum]);

// ============================================================================
// 日本語日付オフセット (JpDateOffset)
// <JpDateOffset> ::= <Integer> <JpPeriodUnit> "後"
//                  | <JpDateKeyword>
//                  | <JpWeekday>
// ============================================================================

/** 日本語期間単位の型 */
type JpPeriodUnit = "年" | "ヶ月" | "か月" | "カ月" | "週" | "日";

/**
 * 日本語期間単位パーサ
 * <JpPeriodUnit> ::= "年" ("間")?
 *                  | ("ヶ月" | "か月" | "カ月") ("間")?
 *                  | "週" ("間")?
 *                  | "日" ("間")?
 */
const jpPeriodUnit: Parser<JpPeriodUnit> = map(
    cat([
        or([
            str("ヶ月"),
            str("か月"),
            str("カ月"),
            str("年"),
            str("週"),
            str("日"),
        ]),
        opt(str("間")),
    ]),
    ([unit]) => unit as JpPeriodUnit,
);

/**
 * 日本語 N単位後 形式のパーサ
 * <Integer> <JpPeriodUnit> "後"
 */
const jpNumericOffset = (now: Date): Parser<DateTimeComponents> =>
    map(cat([integer, jpPeriodUnit, str("後")]), ([n, unit]) => {
        switch (unit) {
            case "年":
                return offsetYears(now, n);
            case "ヶ月":
            case "か月":
            case "カ月":
                return offsetMonths(now, n);
            case "週":
                return offsetWeeks(now, n);
            case "日":
                return offsetDays(now, n);
        }
    });

/**
 * 日本語日付キーワードパーサ
 * <JpDateKeyword> ::= "今年" | "来年" | "再来年"
 *                   | "今月" | "来月" | "再来月"
 *                   | "今週" | "来週" | "再来週"
 *                   | "今日" | "明日" | "明後日" | "明々後日"
 */
const jpDateKeyword = (now: Date): Parser<DateTimeComponents> =>
    or([
        // 年
        map(str("再来年"), () => offsetYears(now, 2)),
        map(str("来年"), () => offsetYears(now, 1)),
        map(str("今年"), () => offsetYears(now, 0)),
        // 月
        map(str("再来月"), () => offsetMonths(now, 2)),
        map(str("来月"), () => offsetMonths(now, 1)),
        map(str("今月"), () => offsetMonths(now, 0)),
        // 週
        map(str("再来週"), () => offsetWeeks(now, 2)),
        map(str("来週"), () => offsetWeeks(now, 1)),
        map(str("今週"), () => offsetWeeks(now, 0)),
        // 日
        map(str("明々後日"), () => offsetDays(now, 3)),
        map(str("明後日"), () => offsetDays(now, 2)),
        map(str("明日"), () => offsetDays(now, 1)),
        map(str("今日"), () => offsetDays(now, 0)),
    ]);

/** 日本語曜日名から曜日番号 (0=日, 1=月, ..., 6=土) へのマッピング */
const jpWeekdayMap: Record<string, number> = {
    日: 0,
    月: 1,
    火: 2,
    水: 3,
    木: 4,
    金: 5,
    土: 6,
};

/**
 * 日本語曜日パーサ
 * <JpWeekday> ::= <JpWeekdayName> ("曜" | "曜日")?
 * <JpWeekdayName> ::= "月" | "火" | "水" | "木" | "金" | "土" | "日"
 */
const jpWeekday = (now: Date): Parser<DateTimeComponents> => {
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
        const targetDay = jpWeekdayMap[name];
        const currentDay = now.getDay();
        // 次の該当曜日までの日数 (同じ曜日なら7日後)
        const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
        return offsetDays(now, daysUntil);
    });
};

/**
 * 日本語日付オフセットパーサ
 * <JpDateOffset> ::= <Integer> <JpPeriodUnit> "後"
 *                  | <JpDateKeyword>
 *                  | <JpWeekday>
 */
const jpDateOffset = (now: Date): Parser<DateTimeComponents> =>
    or([jpNumericOffset(now), jpDateKeyword(now), jpWeekday(now)]);

// ============================================================================
// 英語日付オフセット (EnDateOffset)
// <EnDateOffset> ::= <Integer> " "* <EnPeriodUnit> " "* "later"
//                  | <EnDateKeyword>
//                  | <EnWeekday>
// ============================================================================

/** 英語期間単位の型 */
type EnPeriodUnit = "year" | "month" | "week" | "day";

/**
 * 英語期間単位パーサ
 * <EnPeriodUnit> ::= ("year" | "month" | "week" | "day") ("s")?
 */
const enPeriodUnit: Parser<EnPeriodUnit> = map(
    cat([
        or([str("year"), str("month"), str("week"), str("day")]),
        opt(str("s")),
    ]),
    ([unit]) => unit as EnPeriodUnit,
);

/**
 * 英語 N units later 形式のパーサ
 * <Integer> " "* <EnPeriodUnit> " "* "later"
 */
const enNumericOffset = (now: Date): Parser<DateTimeComponents> =>
    map(
        cat([integer, optSp, enPeriodUnit, optSp, str("later")]),
        ([n, , unit]) => {
            switch (unit) {
                case "year":
                    return offsetYears(now, n);
                case "month":
                    return offsetMonths(now, n);
                case "week":
                    return offsetWeeks(now, n);
                case "day":
                    return offsetDays(now, n);
            }
        },
    );

/**
 * 英語日付キーワードパーサ
 * <EnDateKeyword> ::= "this year" | "next year" | "year after next"
 *                   | "this month" | "next month" | "month after next"
 *                   | "this week" | "next week" | "week after next"
 *                   | "today" | "tomorrow" | "day after tomorrow"
 */
const enDateKeyword = (now: Date): Parser<DateTimeComponents> =>
    or([
        // 年
        map(str("year after next"), () => offsetYears(now, 2)),
        map(str("next year"), () => offsetYears(now, 1)),
        map(str("this year"), () => offsetYears(now, 0)),
        // 月
        map(str("month after next"), () => offsetMonths(now, 2)),
        map(str("next month"), () => offsetMonths(now, 1)),
        map(str("this month"), () => offsetMonths(now, 0)),
        // 週
        map(str("week after next"), () => offsetWeeks(now, 2)),
        map(str("next week"), () => offsetWeeks(now, 1)),
        map(str("this week"), () => offsetWeeks(now, 0)),
        // 日
        map(str("day after tomorrow"), () => offsetDays(now, 2)),
        map(str("tomorrow"), () => offsetDays(now, 1)),
        map(str("today"), () => offsetDays(now, 0)),
    ]);

/** 英語曜日名から曜日番号へのマッピング */
const enWeekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
};

/**
 * 英語曜日パーサ
 * <EnWeekday> ::= <EnWeekdayFull> | <EnWeekdayShort>
 * <EnWeekdayFull> ::= "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday"
 * <EnWeekdayShort> ::= "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
 */
const enWeekday = (now: Date): Parser<DateTimeComponents> => {
    const weekdayNames = or([
        // フルスペル (長い方を先にマッチ)
        str("Wednesday"),
        str("Thursday"),
        str("Saturday"),
        str("Sunday"),
        str("Monday"),
        str("Tuesday"),
        str("Friday"),
        // 短縮形
        str("Sun"),
        str("Mon"),
        str("Tue"),
        str("Wed"),
        str("Thu"),
        str("Fri"),
        str("Sat"),
    ]);

    return map(weekdayNames, (name) => {
        const targetDay = enWeekdayMap[name];
        const currentDay = now.getDay();
        const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
        return offsetDays(now, daysUntil);
    });
};

/**
 * 英語日付オフセットパーサ
 * <EnDateOffset> ::= <Integer> " "* <EnPeriodUnit> " "* "later"
 *                  | <EnDateKeyword>
 *                  | <EnWeekday>
 */
const enDateOffset = (now: Date): Parser<DateTimeComponents> =>
    or([enNumericOffset(now), enDateKeyword(now), enWeekday(now)]);

// ============================================================================
// 日付オフセット (DateOffset) - 日英統合
// <DateOffset> ::= <JpDateOffset> | <EnDateOffset>
// ============================================================================

/**
 * 日付オフセットパーサ
 * <DateOffset> ::= <JpDateOffset> | <EnDateOffset>
 */
const dateOffset = (now: Date): Parser<DateTimeComponents> =>
    or([jpDateOffset(now), enDateOffset(now)]);

// ============================================================================
// 日本語時刻オフセット (JpTimeOffset)
// <JpTimeOffset> ::= <Integer> <JpDurationUnit> "後"
// ============================================================================

/** 日本語時間長単位の型 */
type JpDurationUnit = "時間" | "分" | "秒";

/**
 * 日本語時間長単位パーサ
 * <JpDurationUnit> ::= "時間" ("間")?
 *                    | "分" ("間")?
 *                    | "秒" ("間")?
 */
const jpDurationUnit: Parser<JpDurationUnit> = map(
    cat([or([str("時間"), str("分"), str("秒")]), opt(str("間"))]),
    ([unit]) => unit as JpDurationUnit,
);

/**
 * 日本語時刻オフセットパーサ
 * <JpTimeOffset> ::= <Integer> <JpDurationUnit> "後"
 */
const jpTimeOffset = (now: Date): Parser<DateTimeComponents> =>
    map(cat([integer, jpDurationUnit, str("後")]), ([n, unit]) => {
        const d = new Date(now);
        switch (unit) {
            case "時間":
                d.setHours(d.getHours() + n);
                break;
            case "分":
                d.setMinutes(d.getMinutes() + n);
                break;
            case "秒":
                d.setSeconds(d.getSeconds() + n);
                break;
        }
        return dateToComponents(d);
    });

// ============================================================================
// 英語時刻オフセット (EnTimeOffset)
// <EnTimeOffset> ::= <Integer> " "* <EnDurationUnit> " "* "later"
// ============================================================================

/** 英語時間長単位の型 */
type EnDurationUnit = "hour" | "minute" | "second";

/**
 * 英語時間長単位パーサ
 * <EnDurationUnit> ::= ("hour" | "minute" | "second") ("s")?
 */
const enDurationUnit: Parser<EnDurationUnit> = map(
    cat([or([str("hour"), str("minute"), str("second")]), opt(str("s"))]),
    ([unit]) => unit as EnDurationUnit,
);

/**
 * 英語時刻オフセットパーサ
 * <EnTimeOffset> ::= <Integer> " "* <EnDurationUnit> " "* "later"
 */
const enTimeOffset = (now: Date): Parser<DateTimeComponents> =>
    map(
        cat([integer, optSp, enDurationUnit, optSp, str("later")]),
        ([n, , unit]) => {
            const d = new Date(now);
            switch (unit) {
                case "hour":
                    d.setHours(d.getHours() + n);
                    break;
                case "minute":
                    d.setMinutes(d.getMinutes() + n);
                    break;
                case "second":
                    d.setSeconds(d.getSeconds() + n);
                    break;
            }
            return dateToComponents(d);
        },
    );

// ============================================================================
// 時刻オフセット (TimeOffset) - 日英統合
// <TimeOffset> ::= <JpTimeOffset> | <EnTimeOffset>
// ============================================================================

/**
 * 時刻オフセットパーサ
 * <TimeOffset> ::= <JpTimeOffset> | <EnTimeOffset>
 */
const timeOffset = (now: Date): Parser<DateTimeComponents> =>
    or([jpTimeOffset(now), enTimeOffset(now)]);

// ============================================================================
// 日時複合パーサ
// <Date> " "+ <ClockTime>
// ============================================================================

/** 日付パーサと時刻パーサを空白で結合 */
const dateWithTime = (
    dateParser: Parser<DateTimeComponents>,
): Parser<DateTimeComponents> =>
    map(cat([dateParser, sp, clockTime]), ([d, , t]) => mergeComponents(d, t));

// ============================================================================
// 未来調整関数
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
 * 日時文字列をパースし、未来の日時を返す。
 * そのまま解釈すると過去の時刻となってしまう場合、
 * 現在時刻を基準とした未来の時刻となるように調整が入る場合がある。
 *
 * 文法定義:
 * <DateTime> ::= <TimeOffset>
 *              | <Date> " "+ <ClockTime>
 *              | <Date>
 *
 * <Date> ::= <AbsoluteDate> | <DateOffset>
 * <AbsoluteDate> ::= <FullDate> | <MonthDay> | <DayOnly>
 * <DateOffset> ::= <JpDateOffset> | <EnDateOffset>
 * <TimeOffset> ::= <JpTimeOffset> | <EnTimeOffset>
 * <ClockTime> ::= <Integer> ":" <Integer> (":" <Integer>)?
 *
 * 詳細な文法定義は src/lib/parser/EBNF.txt を参照。
 */
export function parseFutureDateTime(input: string): Date | null {
    const now = new Date();
    const chars = [...input.trim()];

    // パーサと未来調整関数のペア配列
    // 優先順位: 時刻オフセット > 日付オフセット > 日付オフセット+時刻 > 絶対日付+時刻 > 時刻のみ
    const parsers: [Parser<DateTimeComponents>, AdjustFn | null][] = [
        // 時刻オフセット (30分後, 2 hours later など)
        [map(cat([timeOffset(now), eof]), ([c]) => c), noAdjust],

        // 日付オフセットのみ (明日, next week, Monday など)
        [map(cat([dateOffset(now), eof]), ([c]) => c), noAdjust],

        // 日付オフセット + 時刻 (明日 12:00, Monday 10:00 など)
        [map(cat([dateWithTime(dateOffset(now)), eof]), ([c]) => c), noAdjust],

        // 絶対日付 + 時刻 (日のみ: 15日 10:00)
        [map(cat([dateWithTime(dayOnly), eof]), ([c]) => c), adjustNextMonth],

        // 絶対日付 + 時刻 (月日: 1/15 10:00, 1月15日 10:00)
        [map(cat([dateWithTime(monthDay), eof]), ([c]) => c), adjustNextYear],

        // 絶対日付 + 時刻 (年月日: 2026/1/15 10:00)
        [map(cat([dateWithTime(fullDate), eof]), ([c]) => c), noAdjust],

        // 時刻のみ (09:00)
        [map(cat([clockTime, eof]), ([c]) => c), adjustNextDay],
    ];

    for (const [parser, adjust] of parsers) {
        const result = parser(chars);
        if (result.result === "success") {
            const date = componentsToDate(result.data, now);
            if (Number.isNaN(date.getTime())) continue;
            // 過去の日時の場合、調整関数があれば未来に調整
            if (adjust && date <= now) adjust(date);
            return date;
        }
    }

    return null;
}
