# portal/publisher/blog/

note 自動投稿システムの記事格納ディレクトリ。

## ファイル命名規則

YYYY-MM-DD-{kebab-case-title}.md

例: 2026-06-27-kodouflow-focus-tips.md

## 記事フォーマット

先頭に frontmatter を記載:

---
title: 記事タイトル
hashtags: "#タグ1 #タグ2"
---

（本文）

## 自動投稿の仕組み

auto-post-note.sh が今日の日付にマッチするファイルを検索して投稿する。
