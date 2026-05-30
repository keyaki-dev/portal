---
flags:
  - 2_published
created: 2026-02-27
blog_tag:
  - エンジニア
  - 生成AI
  - Claude Code
  - MCP
published_url: https://note.com/keyaki_dev/n/nce8936cdc568
image: 2026-02-27.png
---
# Claude CodeでGoogle DriveのMCPを追加する方法

前回の記事でも触れた通り、Claude CodeにGoogle Drive用のMCPを追加することで、仕様書やユーザーマニュアルの作成・管理を自動化できます。ネット上に参考記事が少なかったため、今回は導入手順をまとめておきます。

今回使用するのは [@piotr-agier/google-drive-mcp](https://github.com/piotr-agier/google-drive-mcp)（v1.2.0）です。

---

## 導入後にできること

このMCPを追加すると、Claude Codeの会話の中で以下のような操作が自然言語で行えるようになります。

- Google Drive内のファイル検索・一覧表示
- Google Docs / Sheets / Slidesの作成・編集・書式設定
- ファイルのアップロード・移動・リネーム・削除
- 共有ドライブへのアクセス

---

## 前提条件

|項目|要件|
|---|---|
|Node.js|v18以上|
|npm / npx|Node.jsに付属|
|Googleアカウント|Google Driveを利用できるアカウント|
|Claude Code|インストール済みであること|

```bash
# バージョン確認
node -v
npm -v
```

---

## 手順1. Google Cloud Consoleの設定

### プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 画面上部のプロジェクト選択メニューから「新しいプロジェクト」をクリック
3. プロジェクト名を入力（例: `claude-drive-mcp`）して「作成」

### APIの有効化

作成したプロジェクトを選択した状態で、左メニュー「APIとサービス」>「ライブラリ」から以下の**4つのAPIすべて**を有効化します。

|API|用途|
|---|---|
|Google Drive API|ファイル管理・検索|
|Google Docs API|ドキュメントの読み書き|
|Google Sheets API|スプレッドシートの読み書き|
|Google Slides API|プレゼンテーションの読み書き|

> **注意:** 1つでも有効化し忘れると、該当サービスへのアクセス時にエラーになります。

### OAuth同意画面の設定

1. 左メニュー「APIとサービス」>「OAuth同意画面」を開く
2. User Typeは「**外部**」を選択して「作成」
3. アプリ名・メールアドレスなど必要事項を入力して「保存して次へ」
4. スコープの画面で以下を追加:
    - `https://www.googleapis.com/auth/drive`
    - `https://www.googleapis.com/auth/drive.file`
    - `https://www.googleapis.com/auth/drive.readonly`
    - `https://www.googleapis.com/auth/documents`
    - `https://www.googleapis.com/auth/spreadsheets`
    - `https://www.googleapis.com/auth/presentations`
5. テストユーザーの画面で「ADD USERS」をクリックし、**利用者全員のGoogleメールアドレスを追加**
6. 「保存して次へ」で完了

### OAuthクレデンシャルの作成

1. 左メニュー「APIとサービス」>「認証情報」を開く
2. 「+ 認証情報を作成」>「OAuthクライアントID」をクリック
3. アプリケーションの種類は必ず**「デスクトップ アプリ」**を選択
4. 名前を入力して「作成」
5. 作成完了ダイアログで「**JSONをダウンロード**」をクリック

---

## 手順2. クレデンシャルファイルの配置

ダウンロードしたJSONファイルをリネームして配置します。

```bash
mkdir -p ~/.config/google-drive-mcp
mv ~/Downloads/client_secret_XXXXX.json ~/.config/google-drive-mcp/gcp-oauth.keys.json
```

> **注意:** このファイルには認証情報が含まれます。Gitリポジトリには絶対にコミットしないでください。

---

## 手順3. Claude CodeへのMCPサーバー登録

以下のコマンドでMCPサーバーを登録します。

```bash
claude mcp add -s user \
  google-drive \
  -e GOOGLE_DRIVE_OAUTH_CREDENTIALS=/Users/<ユーザー名>/.config/google-drive-mcp/gcp-oauth.keys.json \
  -- npx -y @piotr-agier/google-drive-mcp
```

ここで**2つの重要なポイント**があります。

1つ目は、`~`や`$HOME`は使わず**必ず絶対パスで指定する**ことです。シェル展開されず`~/`がそのまま文字列として渡されてしまい、ファイルが見つからないエラーになります。自分のホームディレクトリは`echo $HOME`で確認できます。

2つ目は、**`-s user`を必ず付ける**ことです。これを指定することで、どのディレクトリからClaude Codeを起動してもこのMCPが利用可能になります。指定しないとプロジェクトスコープでの登録になり、ディレクトリをまたいで使えなくなります。

登録後、以下で確認できます。

```bash
claude mcp list
```

`google-drive`が表示されれば登録完了です。

---

## 手順4. 初回認証（OAuth）

Claude Codeを起動し、Google Drive関連の操作を実行すると、自動的にブラウザが開きます。

```bash
claude
```

Googleの同意画面でテストユーザーに追加済みのアカウントでログインし、「許可」をクリックしてアクセスを承認してください。「**このアプリは確認されていません**」と表示された場合は、「詳細」>「（安全でないページ）に移動」と進んでください。

認証成功後、トークンが`~/.config/google-drive-mcp/tokens.json`に自動保存されます。

---

## 動作確認

以下のプロンプトを試してみてください。ファイル一覧が返ってくれば導入成功です。

```
Google Driveのファイルを検索して、最近のファイルを5つ表示して
```

---

なお、OAuthアプリがテスト中の状態（デフォルト）ではトークンの有効期限が**7日間**のため、期限切れ時には再認証が必要です。個人・社内利用で頻繁な再認証を避けたい場合は、Google Cloud ConsoleでOAuthアプリを「公開」ステータスに変更することをおすすめします。

詳細なトラブルシューティングや利用可能なツール一覧については、[公式リポジトリのREADME](https://github.com/piotr-agier/google-drive-mcp)をご参照ください。