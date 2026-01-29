/**
 * utils.ts - ユーティリティ関数
 */

// ============================================================================
// パーサコンビネータ
// 参考: https://blog.livewing.net/typescript-parser-combinator
// ============================================================================

/** パーサの入力型 (コードポイント単位の文字列配列) */
export type ParserInput = readonly string[];

/** パース成功時の出力 */
interface ParseSuccess<T> {
    result: "success";
    data: T;
    rest: ParserInput;
}

/** パース失敗時の出力 */
interface ParseFail {
    result: "fail";
}

/** パーサの出力型 */
export type ParserOutput<T> = Readonly<ParseSuccess<T> | ParseFail>;

/** パーサ関数型 */
export type Parser<T> = (input: ParserInput) => ParserOutput<T>;

/** パーサ型からデータ型を取り出すユーティリティ型 */
export type ParserData<P> = P extends Parser<infer T> ? T : never;

/** Option型: 値の有無を表現 */
interface Some<T> {
    status: "some";
    value: T;
}
interface None {
    status: "none";
}
export type Option<T> = Some<T> | None;

// ----------------------------------------------------------------------------
// プリミティブパーサ
// ----------------------------------------------------------------------------

/** 任意の1文字をパース */
export const anyChar: Parser<string> = (input) => {
    if (input.length > 0) {
        const [data, ...rest] = input;
        return { result: "success", data, rest };
    }
    return { result: "fail" };
};

/** 入力の末尾をパース (0文字の時に成功) */
export const eof: Parser<null> = (input) => {
    if (input.length === 0) {
        return { result: "success", data: null, rest: [] };
    }
    return { result: "fail" };
};

// ----------------------------------------------------------------------------
// 文字パーサを生成する関数
// ----------------------------------------------------------------------------

/** 特定の1文字のみをパース */
type CharFunc = <T extends ParserInput[0]>(c: T) => Parser<T>;
export const char: CharFunc = (c) => (input) => {
    const r = anyChar(input);
    if (r.result === "fail") return r;
    if (r.data !== c) return { result: "fail" };
    return { result: "success", data: c, rest: r.rest };
};

/** 条件を満たす1文字をパース */
type IsFunc = <T extends string>(f: (c: ParserInput[0]) => c is T) => Parser<T>;
export const is: IsFunc = (f) => (input) => {
    const r = anyChar(input);
    if (r.result === "fail") return r;
    if (!f(r.data)) return { result: "fail" };
    return { result: "success", data: r.data, rest: r.rest };
};

// ----------------------------------------------------------------------------
// パーサコンビネータ
// ----------------------------------------------------------------------------

/** not演算子: パーサの成功/失敗を反転 */
type NotFunc = (p: Parser<unknown>) => Parser<null>;
export const not: NotFunc = (p) => (input) => {
    if (p(input).result === "success") {
        return { result: "fail" };
    }
    return { result: "success", data: null, rest: input };
};

/** or演算子: 複数のパーサを順に試し、最初に成功したものを返す */
type OrFunc = <T>(ps: Parser<T>[]) => Parser<T>;
export const or: OrFunc = (ps) => (input) => {
    for (const p of ps) {
        const r = p(input);
        if (r.result === "success") return r;
    }
    return { result: "fail" };
};

/** cat演算子: 複数のパーサを連結 */
type CatFunc = <T extends Parser<unknown>[]>(
    ps: [...T],
) => Parser<{ [K in keyof T]: ParserData<T[K]> }>;
export const cat: CatFunc = (ps) => (input) => {
    const rs: unknown[] = [];
    let i = input;
    for (const p of ps) {
        const r = p(i);
        if (r.result === "fail") return r;
        rs.push(r.data);
        i = r.rest;
    }
    return {
        result: "success",
        data: rs as ParserData<ReturnType<ReturnType<CatFunc>>>,
        rest: i,
    };
};

/** rep演算子: パーサを繰り返し適用 */
type RepFunc = <T>(p: Parser<T>, min?: number, max?: number) => Parser<T[]>;
export const rep: RepFunc =
    (p, min = 0, max = Number.POSITIVE_INFINITY) =>
    (input) => {
        if (min > max) throw new Error("rep: min > max is not allowed.");
        if (min < 0) throw new Error("rep: negative min is not allowed.");
        if (max < 0) throw new Error("rep: negative max is not allowed.");

        const rs: ParserData<typeof p>[] = [];
        let i = input;
        for (let n = 0; n < max; n++) {
            const r = p(i);
            if (r.result === "fail") break;
            rs.push(r.data);
            i = r.rest;
        }
        if (rs.length < min) return { result: "fail" };
        return { result: "success", data: rs, rest: i };
    };

// ----------------------------------------------------------------------------
// ユーティリティパーサ
// ----------------------------------------------------------------------------

/** 解析結果を変換 */
type MapFunc = <T, U>(p: Parser<T>, f: (a: T) => U) => Parser<U>;
export const map: MapFunc = (p, f) => (input) => {
    const r = p(input);
    if (r.result === "fail") return r;
    return { result: "success", data: f(r.data), rest: r.rest };
};

/** 文字列をパース */
type StrFunc = <T extends string>(s: T) => Parser<T>;
export const str: StrFunc = (s) => (input) => {
    const p = cat([...s].map(char));
    const r = p(input);
    if (r.result === "fail") return r;
    return { result: "success", data: s, rest: r.rest };
};

/** オプション演算子: パースできてもできなくてもOK */
type OptFunc = <T>(p: Parser<T>) => Parser<Option<T>>;
export const opt: OptFunc = (p) => (input) => {
    const r = rep(p, 0, 1)(input);
    if (r.result === "fail") return r;
    return {
        result: "success",
        data:
            r.data.length === 0
                ? { status: "none" }
                : { status: "some", value: r.data[0] },
        rest: r.rest,
    };
};

/** 差分演算子: パーサpからパーサqを除外 */
type DiffFunc = <T, U>(p: Parser<T>, q: Parser<U>) => Parser<T>;
export const diff: DiffFunc = (p, q) => map(cat([not(q), p]), ([, r]) => r);

/** リストパーサ: 区切り文字で区切られた要素のリスト (1個以上) */
type ListFunc = <T>(p: Parser<T>, delimiter: Parser<unknown>) => Parser<T[]>;
export const list: ListFunc = (p, delimiter) =>
    map(cat([p, rep(cat([delimiter, p]))]), ([first, rest]) => [
        first,
        ...rest.map(([, r]) => r),
    ]);

// ----------------------------------------------------------------------------
// よく使う文字パーサ
// ----------------------------------------------------------------------------

/** 数字型 */
export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

/** 数字1文字をパース */
export const digit: Parser<Digit> = is((c): c is Digit => /^\d$/.test(c));

/** 整数値をパース */
export const integer: Parser<number> = map(rep(digit, 1), (chars) =>
    Number.parseInt(chars.join("")),
);

/** 大文字アルファベット型 */
export type UpperAlpha =
    | "A"
    | "B"
    | "C"
    | "D"
    | "E"
    | "F"
    | "G"
    | "H"
    | "I"
    | "J"
    | "K"
    | "L"
    | "M"
    | "N"
    | "O"
    | "P"
    | "Q"
    | "R"
    | "S"
    | "T"
    | "U"
    | "V"
    | "W"
    | "X"
    | "Y"
    | "Z";

/** 小文字アルファベット型 */
export type LowerAlpha = Lowercase<UpperAlpha>;

/** アルファベット型 */
export type Alphabet = UpperAlpha | LowerAlpha;

/** 大文字アルファベット1文字をパース */
export const upperAlpha: Parser<UpperAlpha> = is((c): c is UpperAlpha =>
    /^[A-Z]$/.test(c),
);

/** 小文字アルファベット1文字をパース */
export const lowerAlpha: Parser<LowerAlpha> = is((c): c is LowerAlpha =>
    /^[a-z]$/.test(c),
);

/** アルファベット1文字をパース (大文字小文字問わず) */
export const alpha: Parser<Alphabet> = is((c): c is Alphabet =>
    /^[A-Za-z]$/.test(c),
);

/** 空白文字をパース */
export const whitespace: Parser<null> = map(
    rep(or([...[" ", "\t", "\n", "\r"]].map(char))),
    () => null,
);

// ============================================================================
// 日時パーサ (パーサコンビネータ使用)
// ============================================================================

// ----------------------------------------------------------------------------
// 型定義とヘルパー
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// 基本パーサ (再利用可能な部品)
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// 日付+時間の複合パーサ
// ----------------------------------------------------------------------------

/** 日付パーサと時間パーサを空白で結合 */
const dateTime = (
    dateParser: Parser<DateTimeComponents>,
): Parser<DateTimeComponents> =>
    map(cat([dateParser, sp, time]), ([d, , t]) => mergeComponents(d, t));

// ----------------------------------------------------------------------------
// 未来調整の定義
// ----------------------------------------------------------------------------

type AdjustFn = (d: Date) => void;
const noAdjust: AdjustFn | null = null;
const adjustNextDay: AdjustFn = (d) => d.setDate(d.getDate() + 1);
const adjustNextMonth: AdjustFn = (d) => d.setMonth(d.getMonth() + 1);
const adjustNextYear: AdjustFn = (d) => d.setFullYear(d.getFullYear() + 1);

// ----------------------------------------------------------------------------
// メイン関数
// ----------------------------------------------------------------------------

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
