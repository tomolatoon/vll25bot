# vll25bot

Discord Bot with おみくじコマンド 🎊

## 機能

| コマンド | 説明 |
|---------|------|
| `/omikuji` | おみくじを引きます（大吉〜大凶、確率重み付けあり） |
| `/ping` | Botの応答速度を確認（応答時間、WebSocket Ping等） |
| `/remind add` | リマインダーを追加 |
| `/remind modify` | リマインダーを編集 |
| `/remind list` | チャンネルのリマインダー一覧を表示 |
| `/remind remove` | リマインダーを削除 |

> 📖 リマインダー機能の詳細は [docs/reminder.md](docs/reminder.md) を参照してください

### /remind コマンド

| サブコマンド | 引数 | 説明 |
|--------------|------|------|
| `add` | `message`(必須), `datetime`(必須), `channel`(任意) | 指定日時にメッセージを送信 |
| `modify` | `id`(必須), `message`(任意), `datetime`(任意), `channel`(任意) | リマインダーを編集 |
| `list` | `channel`(任意), `user`(任意) | チャンネルの自分のリマインダー一覧（user指定で他ユーザーも可） |
| `list_all` | なし | ギルド内の自分のリマインダーを全て表示 |
| `remove` | `id`(必須) | 指定IDのリマインダーを削除 |

**対応する日時形式:**

- `2026-01-15 09:00` / `2026/01/15 09:00` (完全日時)
- `2026年1月15日 09:00` (日本語完全日時)
- `1/15 09:00` / `1-15 09:00` (月日 + 時間)
- `1月15日 09:00` (日本語月日 + 時間)
- `15日 09:00` (日 + 時間)
- `今日 18:00` / `明日 12:00` / `明後日 10:30`
- `月曜日 10:00` / `火曜 15:00` / `水 09:00` (曜日 + 時間)
- `09:00` (時間のみ、過去なら翌日)
- `30分後` / `1時間後` / `2日後` / `1年後` (相対時間)

### おみくじの出現確率

| 運勢 | 確率 |
|-----|------|
| 大吉 🎊 | 5% |
| 中吉 🎉 | 15% |
| 小吉 🌸 | 20% |
| 吉 ✨ | 25% |
| 末吉 🍀 | 20% |
| 凶 💧 | 12% |
| 大凶 🌧️ | 3% |


## ログ機能

Botのコンソール出力には日時が付与されます。
また、`logs/` ディレクトリに日次（起動毎）のログファイルが `app_YYYY-MM-DD_HH-mm-ss.log` の形式で自動保存されます。

## 必要要件

- [Bun](https://bun.sh/) v1.0.0 以上

## セットアップ

### 1. Discord Developer Portal での設定

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 「New Application」をクリックしてアプリを作成
3. 「Bot」セクションでBotを作成し、トークンをコピー
4. 「OAuth2 > URL Generator」で以下を選択:
   - **Scopes**: `bot`, `applications.commands`
   - **Bot Permissions**: `Send Messages`, `Use Slash Commands`, `Embed Links`
5. 生成されたURLでBotをサーバーに招待

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルを編集:
```env
# 必須
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here

# オプション（開発用：設定するとギルドコマンドとして即座に反映）
GUILD_ID=your_guild_id_here
```

### 3. 依存関係のインストール

```bash
bun install
```

### 4. スラッシュコマンドの登録

```bash
# ギルドコマンドとして登録（開発時・即座に反映）
bun run deploy --guild

# グローバルコマンドとして登録（本番運用・最大1時間で反映）
bun run deploy --global
```

### 5. Botの起動

```bash
bun start
```

開発時（ファイル変更で自動再起動）:
```bash
bun dev
```

## 利用可能なスクリプト

| コマンド | 説明 |
|---------|------|
| `bun run start` | Botを起動 |
| `bun run dev` | 開発モード（ホットリロード） |
| `bun run deploy --global` | グローバルコマンドを登録 |
| `bun run deploy --guild` | ギルドコマンドを登録 |
| `bun run deploy --global --guild` | 両方のコマンドを登録 |
| `bun run clear --global` | グローバルコマンドを削除 |
| `bun run clear --guild` | ギルドコマンドを削除 |
| `bun run clear --global --guild` | 両方のコマンドを削除 |
| `bun run lint` | コードの静的解析 (Biome) |
| `bun run lint-fix` | コードの静的解析 (Biome) |
| `bun run format` | コードのフォーマット (Biome) |
| `bun run test` | テストの実行 (Bun Test) |

## グローバルコマンド vs ギルドコマンド

| 種類 | 対象範囲 | 反映時間 | 用途 |
|------|---------|---------|------|
| グローバル | 全サーバー | 最大1時間 | 本番運用 |
| ギルド | 1サーバーのみ | 即座 | 開発・テスト |

- **開発中**: `bun run deploy --guild` でギルドコマンドとして登録（`GUILD_ID`が必要）
- **本番運用**: `bun run deploy --global` でグローバルコマンドとして登録

### 古いコマンドが残っている場合

以前登録したコマンドがDiscord上に残っている場合は削除できます:

```bash
# ギルドコマンドを削除
bun run clear --guild

# グローバルコマンドを削除
bun run clear --global

# 両方を一括削除
bun run clear --global --guild

# 削除後、再登録
bun run deploy --guild  # または --global
```

## プロジェクト構成

```
vll25bot/
├── src/
│   ├── index.ts               # メインエントリーポイント
│   ├── deploy-commands.ts     # コマンド登録スクリプト
│   ├── reminder.ts            # リマインダー管理
│   ├── lib/
│   │   └── parser/            # パーサコンビネータ & 日時解析
│   │       ├── combinator.ts
│   │       └── date-parser.ts
│   ├── types.ts               # 型定義
│   └── commands/
│       ├── index.ts           # コマンド管理
│       ├── omikuji.ts         # おみくじコマンド
│       ├── ping.ts            # pingコマンド
│       └── remind.ts          # リマインダーコマンド
├── tests/                     # トスト
│   └── date-parser.test.ts
├── .env.example               # 環境変数テンプレート
├── .gitignore
├── biome.json                 # Biome設定
├── package.json
├── tsconfig.json
└── README.md
```

## 新しいコマンドの追加方法

1. `src/commands/` に新しい `.ts` ファイルを作成
   ```typescript
   import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
   import type { Command } from '../types';

   export const myCommand: Command = {
     data: new SlashCommandBuilder()
       .setName('mycommand')
       .setDescription('コマンドの説明'),

     async execute(interaction: ChatInputCommandInteraction) {
       await interaction.reply('Hello!');
     },
   };
   ```

2. `src/commands/index.ts` でインポート・登録
   ```typescript
   import { myCommand } from './mycommand';
   
   const commands: Command[] = [omikuji, ping, myCommand];
   ```

3. 登録
   ```bash
   # 開発時（即座に反映）
   bun run deploy --guild
   
   # 本番運用時
   bun run deploy --global
   ```

## 技術スタック

- **ランタイム**: Bun
- **言語**: TypeScript
- **ライブラリ**: discord.js v14

## ログの絵文字

コンソールログで使用される絵文字の意味:

| 絵文字 | 意味 |
|-------|------|
| ✅ | Bot起動・成功 |
| ⏰ | スケジュール登録 |
| ⏭️ | スキップ（過去のスケジュール等） |
| 📤 | メッセージ送信完了 |
| 💾 | ファイル保存 |
| 📂 | ファイル復元・読み込み |
| 🔄 | 処理中 |
| 🛑 | タスク停止・シャットダウン |
| 🗑️ | 削除 |
| 👋 | オフライン |
| ❌ | エラー |

## ライセンス

MIT