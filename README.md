# vll25bot

Discord.jsを使用したDiscord Botです。チャンネルやフォーラムの投稿件数、特定ユーザーの投稿件数をカウントする機能を提供します。

## 機能

- `/count-channel` - 指定したテキストチャンネルの投稿件数をカウント
- `/count-forum` - 指定したフォーラムチャンネルのスレッド件数をカウント
- `/count-user` - 指定したユーザーの投稿件数をカウント

## セットアップ

### 必要条件

- Node.js 18.0.0以上
- Discord Bot Token

### インストール

1. リポジトリをクローン
   ```bash
   git clone https://github.com/tomolatoon/vll25bot.git
   cd vll25bot
   ```

2. 依存関係をインストール
   ```bash
   npm install
   ```

3. 環境変数を設定
   ```bash
   cp .env.example .env
   ```
   `.env`ファイルを編集し、Discord Bot Tokenを設定してください。

4. ビルド
   ```bash
   npm run build
   ```

5. 起動
   ```bash
   npm start
   ```

### 開発

開発時はts-nodeを使用して直接実行できます：
```bash
npm run dev
```

## コマンド

### /count-channel

テキストチャンネル内の全メッセージ数をカウントします。

**オプション:**
- `channel` (必須): カウント対象のテキストチャンネル

### /count-forum

フォーラムチャンネル内のスレッド数（アクティブ・アーカイブ済み）をカウントします。

**オプション:**
- `forum` (必須): カウント対象のフォーラムチャンネル

### /count-user

指定したユーザーの投稿件数をカウントします。

**オプション:**
- `user` (必須): カウント対象のユーザー
- `channel` (任意): カウント対象のチャンネル（省略時は現在のチャンネル）

## Discord Bot の設定

1. [Discord Developer Portal](https://discord.com/developers/applications)でアプリケーションを作成
2. Bot タブで Bot を追加し、Token を取得
3. OAuth2 タブで以下のスコープを選択:
   - `bot`
   - `applications.commands`
4. Bot の権限で以下を選択:
   - Read Messages/View Channels
   - Read Message History
5. 生成された URL を使用してサーバーに Bot を招待

## ライセンス

ISC