---
title: ブログ公開フロー（川上 運用マニュアル）
---

# ブログ公開フロー

**山下さんのアクションは「記事のレビューとOK出し」のみ。**
OKが出た後の全作業（保存・note投稿・ポートフォリオ公開・後処理）は川上が自動で完結させる。

---

## 事前設定（初回のみ）

以下の環境変数が未設定の場合、note自動投稿が動かない。設定されているか確認し、未設定の場合は山下さんに依頼する。

| 環境変数 | 用途 |
|---|---|
| `NOTE_EMAIL` | note.com ログイン用メールアドレス |
| `NOTE_PASSWORD` | note.com ログイン用パスワード |

確認コマンド:
```bash
echo "NOTE_EMAIL=${NOTE_EMAIL:-未設定}" && echo "NOTE_PASSWORD=${NOTE_PASSWORD:+設定済み}"
```

---

## ステップ 1: 戦略資料の確認

記事着手前に必ず実施する。

```
~/keyaki/portal/blog/plan/
```

このディレクトリ内のファイルを日付でソートし、**最新の計画書・戦略見直しファイル**を読む。
把握すべき内容：

- 直近の目標・ターゲット読者
- コンテンツの役割（集客A / 信頼構築B / プロダクト認知C）
- 減らすべき記事パターン（例: エンジニア向けのCLI解説一辺倒、「やってみた→すごかった」で終わる記事）
- ヒットパターン（スキ率が高かったテーマ・構成）

---

## ステップ 2: 企画・執筆（`/blog` スキル）← 山下さんと協働

`/blog` スキルを起動し、ユーザーとの対話を通じて記事を仕上げる。

### 記事タイプの判定

| タイプ | 特徴 | ペース |
|---|---|---|
| メイン記事（体験型） | 体験・主観・ストーリーが軸。スキ・拡散の主力 | 週1〜2本 |
| サブ記事（ナレッジ型） | 技術手順・リスト・備忘録。頻度維持の穴埋め | メイン記事の合間に自由投稿 |
| 週刊ニュース | 毎週土曜固定。3〜5本のニュース＋所感 | 毎週土曜 |

### メイン記事の主語チェック

タイトルの主語が「技術」ではなく「自分（ユーザー）」になっているか確認する。

| 避けるタイトル | 良いタイトル |
|---|---|
| 〇〇入門 | 〇〇を使ってみたら△△だった話 |
| 〇〇の使い方 | 〇〇で□□を解決した話 |
| 〇〇機能5選 | 〇〇を全部試して、結局△△に絞った理由 |

### 文体の確認

過去記事を1〜2本読み、山下さんの文体（ですます調・一人称「私」・具体的なエピソード重視）に合わせる。
AIっぽい表現（「〜と言えるでしょう」「非常に」の多用など）は避ける。

### 山下さんのアクション（ここだけ）

記事の最終版を会話上で確認してもらい、**「OK」をもらったら次のステップへ進む。**
フィードバックがあれば修正してから再確認する。

---

## ステップ 3: ファクトチェック

OKが出たら、外部ツール・技術・数字が含まれる記事は WebSearch で事実確認してから保存する。

- ツールのプロバイダー対応・機能が最新情報と一致しているか
- 料金・スペック等の数値に誤りがないか（山下さん自身の体験談はそのままでOK）
- OSSのライセンス・スター数等のファクト

---

## ステップ 4: portal に保存・プッシュ

### ファイル保存

保存先: `~/keyaki/portal/blog/`
ファイル名: `YYYY-MM-DD「タイトル」.md`

frontmatter テンプレート:
```yaml
---
created: YYYY-MM-DD
flags:
  - 1_draft
blog_tag:
  - タグ1
  - タグ2
image:
published_url:
---
```

### mainへ直接コミット・プッシュ

ブログコンテンツはレビュー済みのため、PRなしでmainへ直接コミットする。

```bash
git -C ~/keyaki/portal add "blog/YYYY-MM-DD「タイトル」.md"
git -C ~/keyaki/portal commit -m "content: タイトル"
git -C ~/keyaki/portal push origin main
```

---

## ステップ 5: note.com へ自動投稿

```bash
cd ~/keyaki/portal/publisher
node publish-note.js "YYYY-MM-DD「タイトル」.md"
```

- Playwrightがブラウザを起動してnote.comへログイン・投稿を自動実行する
- 完了すると投稿URLが出力される（例: `https://note.com/keyaki_dev/n/xxxxxxxx`）
- このURLを次のステップで使う

> **失敗した場合**
> `/tmp/note-debug.png` または `/tmp/note-before-publish.png` にスクリーンショットが保存される。
> 確認して原因を特定し、必要に応じて手動で投稿して山下さんにURLを確認する。

---

## ステップ 6: フロントマター更新（portal）

note URLが確定したら実施する。

```bash
cd ~/keyaki/portal/publisher
node update-frontmatter.js "YYYY-MM-DD「タイトル」.md" "https://note.com/..."
```

完了後、変更をコミット・プッシュ:

```bash
git -C ~/keyaki/portal add "blog/YYYY-MM-DD「タイトル」.md"
git -C ~/keyaki/portal commit -m "content: 公開URLを更新 — タイトル"
git -C ~/keyaki/portal push origin main
```

これにより frontmatter が以下の状態に更新される:
```yaml
flags:
  - 1_draft
  - 2_published
published_url: https://note.com/...
```

---

## ステップ 7: ポートフォリオ（keyaki-dev.com）に公開

ポートフォリオは `~/keyaki/portfolio/content/blog/` に MDX ファイルを追加するだけで Vercel が自動デプロイする。

### MDX ファイルの作成

ファイル名: `YYYY-MM-DD.mdx`（同日2本目以降は `YYYY-MM-DD-2.mdx`）

frontmatter（ポートフォリオ用）:
```yaml
---
title: "記事タイトル"
date: "YYYY-MM-DD"
description: "記事の内容を1〜2文で要約（SEO・OGP用）"
tags: ["タグ1", "タグ2"]
published: true
---
```

本文はportal/blogのMarkdownをそのまま流用できる（MDX互換）。

### コミット・プッシュ

```bash
git -C ~/keyaki/portfolio add "content/blog/YYYY-MM-DD.mdx"
git -C ~/keyaki/portfolio commit -m "content: タイトル"
git -C ~/keyaki/portfolio push origin main
```

プッシュ後、Vercelが自動でビルド・デプロイを実行する。

---

## ステップ 8: 完了報告（Slack）

全ステップが終わったら山下さんのDMに報告する。

```
【記事公開完了】

タイトル: 〇〇
note: https://note.com/keyaki_dev/n/...
ポートフォリオ: https://keyaki-dev.com/blog/YYYY-MM-DD
```

---

## フロー全体のまとめ

```
【川上】戦略資料確認
    ↓
【川上 + 山下さん】/blog スキルで企画・執筆
    ↓
【山下さん】レビュー → OK ← ここだけ山下さんのアクション
    ↓
【川上】ファクトチェック
    ↓
【川上】portal/blog/ に保存 → main へプッシュ
    ↓
【川上】publish-note.js → note.com に自動投稿 → URL取得
    ↓
【川上】update-frontmatter.js → 2_published + URL更新 → プッシュ
    ↓
【川上】portfolio/content/blog/ に MDX 追加 → main へプッシュ → Vercel 自動デプロイ
    ↓
【川上】Slack で完了報告
```

---

## トラブルシューティング

| 問題 | 対処 |
|---|---|
| `NOTE_EMAIL` / `NOTE_PASSWORD` 未設定 | 環境変数を設定してもらう |
| note自動投稿が失敗 | `/tmp/note-debug.png` を確認 → 手動投稿してURLを取得 |
| portfolio push が失敗 | `git -C ~/keyaki/portfolio pull --rebase` してから再プッシュ |

---

_最終更新: 2026-06-01_
