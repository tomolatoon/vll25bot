# コマンドの管理

## グローバルコマンド vs ギルドコマンド

| 種類 | 対象範囲 | 反映時間 | 用途 |
|------|---------|---------|------|
| グローバル | 全サーバー | 最大1時間 | 本番運用 |
| ギルド | 1サーバーのみ | 即座 | 開発・テスト |

- **開発中**: `bun run deploy --guild` でギルドコマンドとして登録（`GUILD_ID`が必要）
- **本番運用**: `bun run deploy --global` でグローバルコマンドとして登録

## コマンドの登録

```bash
# ギルドコマンドとして登録
bun run deploy --guild

# グローバルコマンドとして登録
bun run deploy --global

# 両方を一括登録
bun run deploy --global --guild
```

## コマンドの削除

```bash
# ギルドコマンドを削除
bun run clear --guild

# グローバルコマンドを削除
bun run clear --global

# 両方を一括削除
bun run clear --global --guild
```
