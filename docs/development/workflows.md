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

<!-- ## CI/CD (GitHub Actions)

Pull Request 作成時に、自動的に以下のジョブが実行されます（設定されている場合）。
- Lint check
- Type check (`tsc --noEmit`)
- Format check

これらがパスしないとマージできない場合があります。ローカルで事前に確認することをお勧めします。 -->
