# note → YouTube 動画 自動生成パイプライン

設計書: `keyaki/docs/03_マーケティング/youtube/20260805_youtube運営設計.md`

## パイプライン全体像

```
note記事(.md)
  │
  ├─ ① 台本化       generate-script.js  ← 実装済み
  │
  ├─ ② スライド生成 generate-slides.js  ← 実装済み
  │
  ├─ ③ 音声生成     generate-voice.js   ← 未実装（VOICEVOX環境待ち）
  │
  ├─ ④ 字幕生成     generate-srt.js     ← 未実装（③完了後）
  │
  ├─ ⑤ 合成         compose-video.js    ← 未実装（ffmpeg インストール待ち）
  │
  ├─ ⑥ メタ生成     generate-meta.js    ← 未実装
  │
  └─ ⑦ Shorts切り出し generate-shorts.js ← 未実装（⑤完了後）
```

## 実装済みスクリプト

### ① `generate-script.js` — 台本化

note 記事（Markdown）を Claude API で動画ナレーション台本 JSON に変換する。

```bash
node generate-script.js <note記事のmdファイルパス> [出力先パス]

# 例
node generate-script.js ../../docs/03_マーケティング/blog/2026-08-16「タスク管理を、もう自分ではやらなくなった話」.md
```

出力: `script.json`（各章の heading, slideBullets, narration, clipMarker, shortsClip を含む）

**必要な環境変数:**
```
ANTHROPIC_API_KEY=sk-ant-...
```

### ② `generate-slides.js` — スライド PNG 生成

`script.json` を読み込み、各章のスライドを 1920×1080 PNG で出力する。
`ANTHROPIC_API_KEY` 不要。Playwright(chromium)で完結。

```bash
node generate-slides.js <script.jsonのパス> [出力先ディレクトリ]

# 例（1本目 ep1）
node generate-slides.js ../../docs/03_マーケティング/youtube/episode1/script.json

# 出力先を指定する場合
node generate-slides.js script.json ./output/ep1/slides/
```

出力: `output/<episodeId>/slides/slide-01.png`, `slide-02.png`, ...

## 未実装工程（環境セットアップ待ち）

| 工程 | 依存 | 必要な対応 |
|---|---|---|
| ③ 音声生成 | VOICEVOX ENGINE | `brew install voicevox` / Docker / バイナリのいずれか。話者選定も要 |
| ④ 字幕生成 | ③の音声長情報 | ③完了後に実装 |
| ⑤ 合成 | ffmpeg | `brew install ffmpeg` |
| ⑥ メタ生成 | Claude API | `ANTHROPIC_API_KEY` |
| ⑦ Shorts | ⑤完了後 | — |

## 出力ディレクトリ構造

```
publisher/youtube/output/<episodeId>/
  slides/
    slide-01.png
    slide-02.png
    ...
  audio/          ← ③実装後
  subtitles/      ← ④実装後
  video.mp4       ← ⑤実装後
  shorts.mp4      ← ⑦実装後
```

`output/` ディレクトリは `.gitignore` で除外している（バイナリが大きいため）。

## 依存パッケージ（`publisher/package.json`）

```
@anthropic-ai/sdk  台本化・メタ生成（Claude API）
gray-matter        Markdown フロントマター解析
playwright         スライド PNG 化（chromium ヘッドレス）
sharp              サムネイル画像生成（⑥で使用）
```

```bash
# publisher/ ディレクトリで実行
cd publisher && npm install
```
