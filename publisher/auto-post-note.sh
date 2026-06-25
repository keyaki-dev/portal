#!/bin/bash
# note 自動投稿スクリプト
# 使い方: ./auto-post-note.sh [記事ファイルパス]
#   引数なし: blog/ ディレクトリから今日の日付に一致するファイルを自動選択
#   引数あり: 指定ファイルを投稿
#
# 環境変数:
#   NOTE_SESSION  — note.com のセッションクッキー（必須）
#   NOTE_FILE     — 投稿する記事ファイルのパス（引数より優先）
#   AUTO_HEADER   — 1 を設定するとタイトルからヘッダー画像を自動生成（省略可）

set -e

# 環境変数読み込み
if [ -f ~/agent/_shared/.env ]; then
  set -a && source ~/agent/_shared/.env && set +a
fi

# NOTE_SESSION チェック
if [ -z "$NOTE_SESSION" ]; then
  echo "エラー: NOTE_SESSION が設定されていません。"
  echo ""
  echo "設定方法:"
  echo "  1. ブラウザで note.com にログインし、DevTools > Application > Cookies を開く"
  echo "  2. _note_session_v5 の値をコピー"
  echo "  3. ~/agent/_shared/.env に NOTE_SESSION=<値> を追記"
  echo "  4. このスクリプトを再実行"
  exit 1
fi

PUBLISHER_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="${PUBLISHER_DIR}/../blog"

# 投稿ファイルの決定（NOTE_FILE 環境変数 > 引数 > 日付自動検索）
if [ -n "$NOTE_FILE" ]; then
  TARGET_FILE="$NOTE_FILE"
elif [ -n "$1" ]; then
  TARGET_FILE="$1"
else
  TODAY=$(TZ='Asia/Tokyo' date +%Y-%m-%d)
  TARGET_FILE=$(find "$BLOG_DIR" -name "${TODAY}*.md" | sort | head -1)
  if [ -z "$TARGET_FILE" ]; then
    echo "エラー: 今日の記事が見つかりませんでした（${TODAY}*.md を検索）"
    echo "明示的にファイルパスを指定するか NOTE_FILE 環境変数を設定してください。"
    exit 1
  fi
fi

if [ ! -f "$TARGET_FILE" ]; then
  echo "エラー: 投稿ファイルが見つかりません: $TARGET_FILE"
  exit 1
fi

FILENAME=$(basename "$TARGET_FILE")
echo "投稿ファイル: $TARGET_FILE"
echo "ファイル名: $FILENAME"

export NOTE_SESSION
export BLOG_DIR
export AUTO_HEADER="${AUTO_HEADER:-1}"

cd "$PUBLISHER_DIR"
node publish-note.js "$FILENAME"
