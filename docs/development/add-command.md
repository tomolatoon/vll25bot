# コマンドの追加方法 (Add Command)

新しい機能やコマンドを追加する際の手順とルールです。

## ディレクトリ選択のルール

機能の規模によって、配置する場所を決定してください。

1. **Misc (その他) 機能**: `src/features/misc/`
    - 1ファイルで完結するシンプルなコマンド（例: おみくじ、Ping、メッセージ取得）
    - 複雑な状態管理やデータベース操作を伴わないもの
    - **配置場所**: `src/features/misc/commands/` に `.ts` ファイルを作成

2. **独立した機能 (Feature)**: `src/features/[feature-name]/`
    - 複数のコマンド、データベース操作、UIコンポーネントを持つ規模の大きい機能（例: リマインダー）
    - **配置場所**: `src/features/` 直下に新しいディレクトリを作成

## 実装手順 (Miscの場合)

1. **コマンドファイルの作成**
   `src/features/misc/commands/my-command.ts` を作成します。

   ```typescript
   import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
   import type { Command } from "../types"; // または "../../core/types"

   export const myCommand: Command = {
       data: new SlashCommandBuilder()
           .setName("mycommand")
           .setDescription("サンプルのコマンドです"),

       async execute(interaction: ChatInputCommandInteraction) {
           await interaction.reply("Hello!");
       },
   };
   ```

2. **インデックスへの登録**
   `src/features/misc/commands/index.ts` (もし存在すれば) またはローダーが自動で読み込む構成か確認します。
   ※ 現在の構成では `src/commands` ではなく `src/features` 以下の所定の場所をローダーが読みに行きます。
   (`src/core/loader.ts` の仕様に従ってください)

3. **デプロイ**
   ```bash
   bun run deploy --guild  # 開発用（即反映）
   ```

## 実装手順 (Featureの場合)

1. **ディレクトリ作成**
   `src/features/new-feature/` を作成します。

2. **構成**
   以下のような構成を推奨します。
   ```
   src/features/new-feature/
   ├── commands/      # Slash Command
   ├── handlers/      # Button/Modal Handler
   ├── services/      # ロジック
   ├── components/    # UIコンポーネント (Embed, Button, Modal)
   ├── utils/         # 機能固有のユーティリティ
   ├── constants.ts   # 定数定義 (ID, カラー, タイマー等)
   ├── types.ts       # 型定義
   └── setup.ts       # イベントハンドラー登録 (必要な場合)
   ```

3. **実装**
   Miscと同様に `Command` インターフェースを実装したファイルを `commands/` に配置します。
