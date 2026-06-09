# kodou flow — Stripe セットアップ手順書

**対象者**: 山下 健太（手動作業が必要な箇所のみ）  
**目的**: Sprint2 の Stripe 決済機能を動かすための準備作業  
**所要時間目安**: 30〜60分

---

## 全体の流れ

```
1. Stripe アカウント作成
    ↓
2. API キー取得（テストモード）
    ↓
3. Vercel 環境変数に設定
    ↓
4. Webhook エンドポイント登録
    ↓
5. プロダクト・価格を作成して price_id を控える
    ↓
（Sprint2 実装後）
6. テストモードで購入フローを確認
    ↓
7. 本番モードに切り替え
```

> **推奨**: テストモードで一通り動作確認してから本番モードへ切り替えること。  
> Stripe はモードの切り替えが簡単なので、まずテストで問題なく動くことを確認してください。

---

## 1. Stripe アカウント作成

### 手順

1. [https://stripe.com/jp](https://stripe.com/jp) を開く
2. 右上「今すぐ始める」をクリック
3. メールアドレス・氏名・パスワードを入力して登録
4. 登録したメールに確認メールが届くので「メールアドレスを確認する」をクリック

### ビジネス情報の入力

アカウント作成後、ダッシュボードから本人確認（KYC）を求められます。  
本番モードで実際に課金するまでは必須ではありませんが、早めに設定しておくと審査期間を短縮できます。

- **ビジネスタイプ**: 個人（フリーランス・個人事業主として登録）
- **業種**: ソフトウェア / SaaS
- **ウェブサイト URL**: `https://kodou.keyaki-dev.com`

> 審査は通常 1〜3 営業日かかります。Sprint2 の実装と並行して申請しておくことを推奨します。

---

## 2. API キーの取得

### テストモード（開発中に使用）

1. Stripe ダッシュボードにログイン
2. 左サイドバー上部の**「テストモード」トグル**がオンになっていることを確認（オレンジの「テスト」バッジが表示される）
3. 左サイドバーの「開発者」→「API キー」を開く
4. 以下の 2 つを控える：

| キー名 | ダッシュボードの表示 | 説明 |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 「公開可能キー」`pk_test_xxx` | フロントエンドで使用 |
| `STRIPE_SECRET_KEY` | 「シークレットキー」`sk_test_xxx`（「表示する」ボタンで確認）| サーバーサイドのみ使用 |

> **注意**: シークレットキーは絶対にフロントエンドコードや git リポジトリに含めないこと。

### 本番モード（ローンチ時に使用）

テストモードトグルを**オフ**（本番モード）に切り替えると、それぞれ `pk_live_xxx` / `sk_live_xxx` のキーが表示されます。  
本番キーは Sprint3 のローンチ直前に Vercel に追加します。

---

## 3. Vercel 環境変数への設定

### 設定が必要な環境変数

| 変数名 | 値の例 | 説明 |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_xxx...` | Stripe シークレットキー（テスト）|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_xxx...` | Stripe 公開キー（テスト）|
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx...` | Webhook 署名検証用（手順 4 で取得）|

### Vercel ダッシュボードでの設定手順

1. [https://vercel.com](https://vercel.com) にログイン
2. 「kodou flow」プロジェクトを選択
3. 上部タブ「Settings」を開く
4. 左メニューの「Environment Variables」を開く
5. 「Add New」ボタンをクリック
6. 各変数を以下のように設定：
   - **Key**: 変数名（例: `STRIPE_SECRET_KEY`）
   - **Value**: 取得したキーの値
   - **Environments**: `Production`・`Preview`・`Development` すべてにチェック
7. 「Save」をクリック
8. 3 変数すべて登録後、**Redeploy** が必要（「Deployments」→ 最新のデプロイ → 「...」→「Redeploy」）

---

## 4. Webhook エンドポイントの設定

### Webhook とは

Stripe の決済完了・サブスク更新などのイベントを kodou flow サーバーにリアルタイム通知する仕組みです。  
この設定がないと、決済完了後にユーザーを Pro プランに昇格できません。

### エンドポイント登録手順

1. Stripe ダッシュボードの「開発者」→「Webhook」を開く
2. 「エンドポイントを追加」ボタンをクリック
3. 以下の情報を入力：

**エンドポイント URL:**
```
https://kodou.keyaki-dev.com/api/stripe/webhook
```

**受信するイベント**（「イベントを選択」から以下を追加）:

| イベント名 | タイミング |
|---|---|
| `checkout.session.completed` | Checkout 完了（決済成功）|
| `customer.subscription.created` | サブスクリプション新規作成 |
| `customer.subscription.updated` | プラン変更・更新 |
| `customer.subscription.deleted` | サブスクリプション解約・期限切れ |
| `invoice.payment_succeeded` | 月次/年次の自動更新成功 |
| `invoice.payment_failed` | 自動更新失敗（カード切れ等）|

4. 「エンドポイントを追加」ボタンで保存

### Signing Secret（STRIPE_WEBHOOK_SECRET）の取得

1. 登録したエンドポイントの詳細ページを開く
2. 「署名シークレット」の「表示する」をクリック
3. `whsec_xxx...` の文字列を控える
4. これを手順 3 の `STRIPE_WEBHOOK_SECRET` として Vercel に設定する

> **テスト時の注意**: ローカル開発でWebhookをテストする場合は `stripe listen --forward-to localhost:3000/api/stripe/webhook` コマンドを使います（engineer が対応）。本番 URL を登録するのは Vercel デプロイ後。

---

## 5. プロダクト・価格の作成

### kodou flow のプラン設定

| プラン | 価格 | Stripe の種別 |
|---|---|---|
| Pro 月額 | ¥490/月 | 定期課金（月次）|
| Pro 年額 | ¥3,980/年 | 定期課金（年次）|

### 作成手順

1. Stripe ダッシュボードの「製品カタログ」→「製品」を開く
2. 「製品を追加」ボタンをクリック
3. 以下を入力して「製品を保存」：
   - **製品名**: `kodou flow Pro`
   - **説明**: `セッション無制限・統計グラフ・カスタムテーマ`
   - **画像**: （任意）
4. 価格の追加（月額）：
   - 「価格を追加」をクリック
   - **価格モデル**: 定額
   - **金額**: `490`
   - **通貨**: `JPY`
   - **請求期間**: 毎月
   - 「価格を保存」→ `price_xxx...`（月額 price_id）を控える
5. 価格の追加（年額）：
   - 同じ製品で「別の価格を追加」
   - **金額**: `3980`
   - **通貨**: `JPY`
   - **請求期間**: 毎年
   - 「価格を保存」→ `price_xxx...`（年額 price_id）を控える

### price_id を engineer に共有する方法

取得した 2 つの price_id を `~/agent/_shared/.env` に追記してください：

```env
STRIPE_PRICE_ID_MONTHLY=price_xxx（月額）
STRIPE_PRICE_ID_YEARLY=price_xxx（年額）
```

その後 `~/agent/_shared/tasks/inbox/` に engineer 宛のタスクとして通知すれば Sprint2 の実装に組み込まれます。

---

## 6. テストカード番号（動作確認用）

Sprint2 実装後の動作確認に使用してください。実際の請求は発生しません。

| カード番号 | 動作 |
|---|---|
| `4242 4242 4242 4242` | 決済成功 |
| `4000 0000 0000 9995` | 決済失敗（残高不足）|
| `4000 0025 0000 3155` | 3D セキュア認証が必要 |

- 有効期限: 未来の任意の日付（例: `12/28`）
- CVC: 任意の 3 桁（例: `123`）
- 郵便番号: 任意（例: `100-0001`）

---

## 7. 本番モードへの切り替え（Sprint3 以降）

テストモードで一通り問題なく動いたら、以下の手順で本番に切り替えます。

1. Stripe ダッシュボードのテストモードトグルを**オフ**に切り替え
2. 本番モードの API キー（`pk_live_xxx` / `sk_live_xxx`）を Vercel に追加
3. 本番モードで製品・価格を再作成（テストと同じ設定）
4. Webhook エンドポイントを本番モードでも登録
5. Vercel の `STRIPE_SECRET_KEY` を本番キーに更新して Redeploy

> 本番モード移行は Stripe のアカウント審査通過後に可能になります。Sprint3 開始前に審査申請を完了しておいてください。

---

## チェックリスト

### Sprint2 開始前に山下がやること

- [ ] Stripe アカウント作成・メール確認
- [ ] 本人確認（KYC）申請（審査に時間がかかるため早めに）
- [ ] テストモードの API キー 2 つを控える
- [ ] Vercel 環境変数に `STRIPE_SECRET_KEY`・`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` を設定
- [ ] Webhook エンドポイント登録（`https://kodou.keyaki-dev.com/api/stripe/webhook`）
- [ ] `STRIPE_WEBHOOK_SECRET` を控えて Vercel に設定
- [ ] プロダクト「kodou flow Pro」作成・月額/年額の price_id を控える
- [ ] `~/agent/_shared/.env` に price_id を追記

---

*作成: pm-kodouflow / 2026-06-09*
