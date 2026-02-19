# セットアップガイド

## 必要要件
- [Bun](https://bun.sh/) v1.0.0 以上
- Discord アカウント

## 1. Discord Developer Portal での設定
0. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
0. 「New Application」をクリックしてアプリを作成
0. **Bot** セクションでBotを作成し、Tokenをコピー
0. **Installation > Default Install Settings > Guild Install** で必要な権限を設定
   - **Scopes**: `bot`, `applications.commands`
   - **Permissions**: いい感じにしてください
1. **Bot > Privileged Gateway Intents** を必要に応じて有効化
2. 生成されたURLでBotをサーバーに招待

## 2. 環境構築
リポジトリをクローンし、依存関係をインストールします。

```bash
git clone https://github.com/tomolatoon/vll25bot.git
cd vll25bot
bun install
```

## 3. 環境変数の設定
`.env.example` をコピーして `.env` を作成します。

```bash
cp .env.example .env
```

`.env` を編集し、先ほど取得したToken等を設定します。

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here

# 開発用ギルドID（指定すると deploy --guild で即座にコマンドが反映されます）
GUILD_ID=your_guild_id_here
```

## 4. コマンドの登録 (デプロイ)
Discord にスラッシュコマンドを登録します。

```bash
# 開発用: ギルドコマンドとして登録 (即座に反映)
bun run deploy --guild

# 本番用: グローバルコマンドとして登録 (反映に時間がかかる場合あり)
bun run deploy --global
```

## 5. 起動

```bash
# 開発モード (ホットリロード有効)
bun dev

# 本番モード
bun start
```
