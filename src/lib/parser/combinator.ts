/**
 * combinator.ts - パーサコンビネータライブラリ
 * 参考: https://blog.livewing.net/typescript-parser-combinator
 */

// ============================================================================
// 基本型定義
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

// ============================================================================
// プリミティブパーサ
// ============================================================================

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

// ============================================================================
// 文字パーサ生成
// ============================================================================

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

// ============================================================================
// コンビネータ
// ============================================================================

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
        if (min > max) throw new Error("rep: min > max は許可されていません");
        if (min < 0) throw new Error("rep: min に負の値は許可されていません");
        if (max < 0) throw new Error("rep: max に負の値は許可されていません");

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

// ============================================================================
// ユーティリティパーサ
// ============================================================================

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

// ============================================================================
// よく使う文字パーサ
// ============================================================================

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
