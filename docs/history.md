# バージョン履歴

## v2.0.0 (2026/02/20)

リマインド機能が大幅に強化され，ドキュメント整備やファイル構造を大規模に改修．

リマインドには次のような新機能が追加．

- リマインドが秒単位の正確な送信
- リマインドの編集機能
- リマインド一覧のページネーション
- リマインドの詳細表示機能
- embed による構造化された表示

コマンドの変更は次のよう．

- `/remind`
  - `/remind modify`（新規追加）
  - `/remind cancel`（`/remind remove` からの改名）
  - `/remind list`（`/remind list-all` を吸収）
  - `/remind show`（新規追加）
- `/fetch`（新規追加）

## v1.0.0 (2026/01/30)

以下の機能を一通り実装．リマインドが json で管理されていたり，ドキュメント整備やファイル構造の観点から取り急ぎの実装．

- `/ping`
- `/omikuji`
- `/kanwa`
- `/remind`
  - `/remind add`
  - `/remind remove`
  - `/remind list`
  - `/remind list-all`
