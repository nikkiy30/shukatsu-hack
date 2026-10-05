# 保守・安全性ロードマップ

このドキュメントは、アプリの利便性ではなく、公開後も安心して開発を続けるための保守、デプロイ、セキュリティ面の展望を整理するものです。

## 現在の状態

このアプリは GitHub にコードを置き、GitHub Actions で lint、build、runtime 依存の audit を確認できる状態です。Vercel との GitHub 連携により、変更を push したときに preview や production deployment を作れる構成になっています。

また、GitHub の ruleset により、`main` ブランチへ変更を入れる条件を管理できる状態になっています。CI を必須チェックとして扱うことで、壊れた変更が本番ブランチへ入る可能性を下げられます。

## 近いうちに整えること

1. GitHub Security の基本機能を有効化する

   Dependency graph、Dependabot alerts、Dependabot security updates を確認します。これは依存パッケージの脆弱性を見つけるための土台です。

2. Vercel の deployment 状態を確認する

   PR や branch push で preview URL が作られること、`main` への反映で production URL が更新されることを確認します。

3. ruleset と CI の関係を確認する

   CI が成功しない変更を `main` に入れない設定になっているか確認します。個人開発でも、この仕組みがあると作業ミスを早めに止められます。

4. runtime と development の脆弱性を分けて判断する

   ユーザーに届く依存と、ビルドや開発時だけ使う依存ではリスクが違います。alert はすぐに機械的に直すのではなく、影響範囲を見て扱います。

## 中期的に整えること

1. テストを追加する

   まずは日時抽出ロジックの単体テストを追加します。予定登録の正確さはアプリの信頼性に直結するため、UI より先に純粋なロジックを守るのが効果的です。

2. セキュリティ観点のレビューを行う

   localStorage、ユーザー入力 URL、カレンダー出力、外部サービス連携の境界を確認します。公開前や大きな仕様変更の前後で、Codex Security などによるレビューを行う候補があります。

3. preview と production の使い分けを習慣化する

   preview は変更確認用、production は実際に人に見せる本番用として扱います。見た目だけでなく、フォーム、保存、カレンダー出力など主要導線を preview で確認してから本番へ反映します。

4. データのバックアップ手段を検討する

   すぐにログインやクラウド同期へ進むのではなく、まずは localStorage の export/import を検討します。個人情報を扱うため、同期機能は便利さとリスクを分けて考えます。

## 将来的に検討すること

1. GitHub Actions 経由の Vercel deployment

   通常は Vercel の GitHub 連携で十分です。GitHub Actions で build した成果物だけを Vercel に送る、deployment 条件を細かく制御する、複数環境を厳密に分ける、といった必要が出た場合に検討します。

2. staging 環境

   staging は、本番に近い固定の確認環境です。現在は Vercel の preview deployment が staging に近い役割を果たします。外部 API、ログイン、DB などが増えた段階で、固定 staging の必要性を見直します。

3. deployment checks

   deployment checks は、本番反映の前に追加条件を通す仕組みです。E2E テスト、Lighthouse、外部監視、手動承認などを本番公開前の条件にできます。現時点では ruleset と CI の方が優先です。

4. ログインと同期

   ログインやクラウド同期により、複数端末でデータを共有できます。一方で、ES、自己PR、面接メモなどの個人情報を外部に保存することになるため、認証、権限、削除、バックアップ、プライバシー説明を合わせて設計する必要があります。

## 基本方針

保守やセキュリティの仕組みは、複雑にすれば安全になるわけではありません。まずは小さく、見える形で、壊れた変更や危ない依存に気づける状態を作ります。

そのうえで、アプリの利用範囲が広がったり、扱うデータが増えたり、外部サービス連携が必要になった段階で、deployment checks、staging、ログイン、同期などを段階的に検討します。
