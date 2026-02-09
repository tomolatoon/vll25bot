# アーキテクチャルール (Rules)

vll25bot の開発におけるアーキテクチャ上のルールです。
保守性を維持するために、以下のルールを遵守してください。

## 依存関係ルール (Dependency Rules)

ディレクトリ間の import は、以下の方向にのみ許可されます。

1. **Feature層 (`src/features/*`)**
    - ✅ **依存OK**: `src/core`, `src/db`, `src/config`, `src/lib`
    - 🚫 **依存NG**: 他の Feature (`src/features/other-feature`)

2. **Core層 (`src/core`)**
    - ✅ **依存OK**: `src/config`, `src/lib`
    - 🚫 **依存NG**: `src/features`

3. **DB層 (`src/db`)**
    - 可能な限り他の層に依存せず、純粋なデータアクセス層として保ってください。

## Repository パターン
- データベース操作は必ず **Repositoryクラス** (`src/db/repositories/*.ts`) を介して行ってください。
- Command や Service から直接 `db.query` などを呼び出してはいけません。
- **エラーハンドリング**:
    - データが見つからない場合: `null` を返す (`Promise<T | null>`)
    - 接続エラーなど予期しない場合: 例外をスローする

## モジュールローディング
- Command や Service ファイルは `default export` を使用してください。
- これは `src/core/loader.ts` が動的にモジュールをロードする際の仕様です。

## コーディング規約
- **命名規則**:
    - クラス: PascalCase (`ReminderRepository`)
    - ファイル: kebab-case (`reminder-repository.ts`)
    - 関数/変数: camelCase (`findUserById`)
- **エラー処理**:
    - 予期しないエラーは例外をスローし、トップレベル（Command実行部）で catch してユーザーにエラーメッセージを返してください。
    - ログを適切に記録してください（`src/lib/logger.ts` を使用してください）。
