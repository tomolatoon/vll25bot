# ディレクトリ構成 (Structure)

vll25bot のディレクトリ構成とその役割について解説します。

## 全体構造

```
vll25bot/
├── .agent/                 # AIエージェント向けのルール定義 (英語)
├── docs/                   # 人間向けのドキュメント (日本語)
│   ├── development/        # 開発者ガイド
│   └── features/           # 機能仕様書
├── logs/                   # アプリケーションログ (Git管理外)
├── src/                    # ソースコード
│   ├── config/             # 設定ファイル・環境変数定義
│   ├── core/               # アプリケーションのコア機能
│   ├── db/                 # データベースアクセス層
│   ├── features/           # 機能ごとの実装 (Feature層)
│   ├── lib/                # 汎用ユーティリティ
│   └── index.ts            # エントリーポイント
├── tests/                  # テストコード
└── README.md               # プロジェクトトップページ
```

## src/ ディレクトリ詳細

### `src/config/`
環境変数の読み込みとバリデーションを行います。
- `env.ts`: Zod を使用して `process.env` を検証し、型安全な設定オブジェクトをエクスポートします。

### `src/core/`
フレームワーク非依存のコアロジックや、Botの基盤となる機能です。
- `client.ts`: Discord Client の初期化
- `loader.ts`: コマンドやイベントの動的読み込み
- `types.ts`: アプリケーション全体で使う型定義 (`Command` インターフェースなど)

### `src/db/`
SQLite データベースへのアクセスを管理します。
- `index.ts`: データベース接続の初期化
- `schema.ts`: テーブル定義
- `repositories/`: データアクセスロジック (Repository Pattern)

### `src/features/`
Botの機能（Feature）ごとにディレクトリを分けて管理します。
詳細は [アーキテクチャルール](rules.md) を参照してください。

```
src/features/
├── misc/                 # 単発のコマンドや小規模な機能 (omikuji, ping, fetchなど)
│   ├── commands/         # スラッシュコマンド定義
│   ├── handlers/         # インタラクションハンドラー
│   ├── setup.ts          # イベントハンドラー登録
│   └── types.ts          # 型定義
└── remind/               # 大規模な機能 (リマインダー)
    ├── commands/         # スラッシュコマンド (add, list, modify...)
    ├── components/       # UIコンポーネント (Embed, Button, Modalビルダー)
    ├── handlers/         # インタラクションハンドラー (ボタン/モーダル操作)
    ├── services/         # ビジネスロジック
    ├── utils/            # 機能固有のユーティリティ
    ├── constants.ts      # 定数定義 (ID, カラー, タイマー, 表示制限)
    └── setup.ts          # イベントハンドラー登録
    # ※ types.ts は feature 固有の型を定義する場合のみ作成する
    # ※ DB層の型 (Reminder 等) は @db/types から直接インポートする
```

### `src/lib/`
特定の機能に依存しない、純粋なユーティリティ関数群です。
- `logger.ts`: ロガー設定
- `parser/`: 日時解析などのパーサーロジック
