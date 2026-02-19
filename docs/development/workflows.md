# ワークフロー (Workflows)

開発時のテスト、静的解析、フォーマットの手順です。

## 静的解析 (Lint)

コードの品質を保つため、Biome を使用しています。
コミット前に必ず実行してください。

```bash
# 問題の検出
bun lint

# 自動修正可能な問題の修正
bun lint-fix
```

## フォーマット (Format)

コードスタイルを統一します。

```bash
bun format
```

## テスト (Test)

Bun のテストランナーを使用しています。

```bash
# 全テストの実行
bun test

# 特定のファイルのテスト
bun test tests/date-parser.test.ts
```

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に従ってください。

| プレフィックス | 用途 |
| --- | --- |
| `feat:` | 新機能 |
| `fix:` | バグ修正・機能変更を伴う修正 |
| `lint:` | lint についての修正（`lint&fix:` もよく用いる） |
| `refac:` | コードの再構築（狭義リファクタリング．動作変更なし） |
| `rec:` | コードの再構築（広義リファクタリング．動作変更あり） |
| `docs:` | ドキュメントの変更のみ |
| `chore:` | 小さな変更（他のプレフィックスに該当しないもの） |

<!-- ## CI/CD (GitHub Actions)

Pull Request 作成時に、自動的に以下のジョブが実行されます（設定されている場合）。
- Lint check
- Type check (`tsc --noEmit`)
- Format check

これらがパスしないとマージできない場合があります。ローカルで事前に確認することをお勧めします。 -->
