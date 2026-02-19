新しいフィーチャーを追加します。以下の手順で実装してください。

1. `src/features/[name]/` ディレクトリを作成する
2. `constants.ts` を作成する — ID・カラー・タイマー・表示制限など、**すべての定数を最初に定義する**
3. feature 固有の型がある場合のみ `types.ts` を作成する（`@db/types` の再エクスポートは不要）
4. `commands/` にスラッシュコマンドを実装する
5. `handlers/` にインタラクションハンドラーを実装する（`idPrefix` は必ず定数を使用）
6. ドメインロジックが必要な場合は `services/` に実装する
7. `components/` に UI ビルダー（Embed, ActionRow, Modal）を実装する（カスタムIDは定数を使用）
8. イベントリスナーが必要な場合は `setup.ts` を作成する（`default export` の関数）
9. `/finish` を実行する（format → lint-fix → test）
10. `README.md` に新機能を反映する
