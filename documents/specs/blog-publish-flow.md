---
title: ブログ公開フロー（川上 運用マニュアル）
---

# ブログ公開フロー

note.com への記事投稿をゴールとした、企画から公開後の後処理までの一連のフローをまとめる。
川上はこのドキュメントを参照しながら、ユーザーがnoteに投稿できる状態まで準備を完結させる。

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

## ステップ 2: 企画・執筆（`/blog` スキル）

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

---

## ステップ 3: ファクトチェック

外部ツール・技術・数字が含まれる記事は WebSearch で主要な事実を確認してから保存する。
確認観点の例：

- ツールのプロバイダー対応・機能が最新情報と一致しているか
- 料金・スペック等の数値に誤りがないか（ユーザー自身の体験談はそのままでOK）
- OSSのライセンス・スター数等のファクト

---

## ステップ 4: ファイル保存

### 保存先

```
~/keyaki/portal/blog/
```

### ファイル名フォーマット

```
YYYY-MM-DD「タイトル」.md
```

例: `2026-06-01「Claude Codeが好きだからこそ、依存しない体制を整えた——OpenCodeという選択肢」.md`

### frontmatter テンプレート

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

- `flags` は必ず `1_draft` からスタート
- `image` と `published_url` は空欄でOK（公開後に更新）

---

## ステップ 5: コミット・PR作成

### ブランチ作成

```bash
git -C ~/keyaki/portal checkout -b content/<内容の短縮名>
```

例: `content/opencode-article`

### コミット

```bash
git -C ~/keyaki/portal add "blog/YYYY-MM-DD「タイトル」.md"
git -C ~/keyaki/portal commit -m "content: タイトル"
git -C ~/keyaki/portal push -u origin content/<ブランチ名>
```

コミットメッセージのプレフィックスは `content:` を使う。

### PR作成

```bash
cd ~/keyaki/portal && gh pr create --title "content: タイトル" --body "..."
```

> **注意（2026年6月現在）**
> `gh pr create` は keyaki-dev PAT のスコープ不足により失敗することがある。
> その場合は以下のURLからユーザーが手動で作成する:
> `https://github.com/keyaki-dev/portal/pull/new/<ブランチ名>`
> Slackでそのリンクを共有して案内すること。

---

## ステップ 6: ユーザーへの引き継ぎ

以下を Slack（山下 DM）で報告する:

```
記事の準備ができました。

タイトル: 〇〇
PR: https://github.com/keyaki-dev/portal/pull/new/<ブランチ名>

マージ後、noteへの投稿とポートフォリオ公開をお願いします。
note投稿後にURLを教えていただければ、こちらでフロントマターを更新します。
```

---

## ステップ 7: 公開後のフロントマター更新

note投稿が完了し、URLが確定したら実施する。

```bash
cd ~/keyaki/portal/publisher
node update-frontmatter.js "YYYY-MM-DD「タイトル」.md" "https://note.com/..."
```

完了後、変更をコミット・プッシュ:

```bash
git -C ~/keyaki/portal add "blog/YYYY-MM-DD「タイトル」.md"
git -C ~/keyaki/portal commit -m "content: 公開URLを更新 — タイトル"
git -C ~/keyaki/portal push
```

これにより frontmatter が以下の状態に更新される:

```yaml
flags:
  - 1_draft
  - 2_published
published_url: https://note.com/...
```

---

## フロー全体のまとめ

```
戦略資料確認
    ↓
/blog スキルで企画・執筆
    ↓
ファクトチェック（WebSearch）
    ↓
ファイル保存（blog/）← flags: 1_draft
    ↓
ブランチ作成・コミット・プッシュ
    ↓
PR作成 → Slackで共有
    ↓
【ユーザー】PR確認・マージ → note投稿 → ポートフォリオ公開
    ↓
【川上】フロントマター更新（2_published + published_url）← note URL受け取り後
```

---

_最終更新: 2026-06-01_
