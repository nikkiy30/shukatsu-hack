# 開発進行メモ

このメモは、作業の順番を忘れないための短期的な進行表です。大きな展望は `docs/roadmap.md`、保守・安全性の展望は `docs/security-maintenance-roadmap.md` に分けています。

## 現在の方針

学びを最大化するため、目的ごとにブランチを分けて進めます。

1つのブランチには、原則として1つの主目的だけを持たせます。これにより、変更の意図、レビュー観点、壊れたときの戻し方、学ぶ内容が見えやすくなります。

## 現在のブランチ状況

- `docs/security-maintenance-roadmap`
  - 目的: `AGENTS.md`、保守・安全性ロードマップ、開発進行メモの追加
  - 次: push して PR を作り、CI を確認してから `main` に merge する

- `refactor/split-app-components`
  - 目的: `src/App.jsx` を機能単位に分割する
  - 状態: `main` から作成済み
  - 次: docs 系ブランチの merge 後に `main` を取り込み直してから作業を始める

## 推奨順序

1. docs 系ブランチを push する

   ```bash
   git switch docs/security-maintenance-roadmap
   git push -u origin docs/security-maintenance-roadmap
   ```

2. GitHub で PR を作る

   - base: `main`
   - compare: `docs/security-maintenance-roadmap`
   - CI が通ることを確認する
   - 内容を確認して merge する

3. ローカルの `main` を更新する

   ```bash
   git switch main
   git pull origin main
   ```

4. refactor ブランチを最新の `main` に合わせる

   ```bash
   git switch refactor/split-app-components
   git rebase main
   ```

5. `App.jsx` 分割を始める

   このブランチでは、見た目や機能を変えずに構造整理だけを行います。

## ブランチ粒度のルール

分ける価値が高いもの:

- 目的が違う変更
- 壊れたときに戻したい変更
- レビュー観点が違う変更
- 学ぶ概念が違う変更
- CI で失敗したときに原因を切り分けたい変更

まとめてよいもの:

- 同じ目的の小さな修正
- docs のリンク修正
- lint を通すための軽微な修正
- 1回で理解できる範囲の小さな補助変更

## 次の開発候補

1. `refactor/split-app-components`

   `ScheduleTab`、`MailTemplateTab`、`DocumentTab`、モーダル、日時抽出 utility などを分けます。最初は振る舞いを変えず、構造だけを整理します。

2. `test/schedule-extraction`

   日時抽出ロジックの単体テストを追加します。テストによって、次の改善で何を壊していないか確認できるようにします。

3. `feat/improve-schedule-extraction`

   年の保持、複数候補日、日付妥当性、会議 URL 優先など、予定抽出の精度を改善します。

4. `feat/document-management-ux`

   書類管理に削除確認、検索、種別フィルター、export/import などを追加します。

## 次回再開時の合言葉

次に作業を再開するときは、次のように依頼するとよいです。

```text
docs/development-plan.md と AGENTS.md を読んで、続きから進めて
```

AI はこのメモと `AGENTS.md` を確認し、現在のブランチ、未コミット差分、main との差分を見てから作業を始めます。
