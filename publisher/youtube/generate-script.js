// YouTube 動画台本生成スクリプト（①台本化）
// note 記事(.md)を読み込み、Claude API で動画ナレーション台本 JSON に変換する
// 使い方: node generate-script.js <note記事のmdファイルパス> [出力先パス]
// 出力先省略時: 入力ファイルと同じディレクトリに script.json を生成
// 環境変数: ANTHROPIC_API_KEY (必須)

'use strict';

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const Anthropic = require('@anthropic-ai/sdk');

// ──────────────────────────────────────────────────────
// ヘルプ
// ──────────────────────────────────────────────────────
if (process.argv[2] === '--help' || process.argv[2] === '-h') {
  console.log(`
使い方:
  node generate-script.js <note記事のmdファイルパス> [出力先パス]

  <note記事のmdファイルパス>  gray-matter フロントマター付き Markdown ファイル (必須)
  [出力先パス]                 出力する script.json のパス (省略時: 入力ファイルと同じディレクトリ)

必要な環境変数:
  ANTHROPIC_API_KEY   Anthropic API キー (必須)

出力スキーマ:
  {
    "episodeId": "ep1",
    "title": "動画タイトル",
    "sourceArticle": "元記事のパス",
    "targetDurationMinutes": "9-11",
    "voice": "落ち着いた解説向き（VOICEVOX話者は別途選定）",
    "note": "台本の補足",
    "chapters": [
      {
        "index": 1,
        "id": "hook",
        "heading": "章の見出し",
        "slideBullets": ["箇条書き1", "箇条書き2"],
        "narration": "この章のナレーション本文（話し言葉）",
        "clipMarker": false,
        "shortsClip": false
      }
    ]
  }

例:
  node generate-script.js ../../docs/03_マーケティング/blog/2026-08-16「タスク管理を、もう自分ではやらなくなった話」.md
  node generate-script.js article.md output/ep2/script.json
`);
  process.exit(0);
}

// ──────────────────────────────────────────────────────
// 引数チェック
// ──────────────────────────────────────────────────────
const inputPath = process.argv[2];
if (!inputPath) {
  console.error('エラー: note記事のmdファイルパスを指定してください');
  console.error('  node generate-script.js <mdファイルパス> [出力先パス]');
  console.error('  node generate-script.js --help でヘルプを表示');
  process.exit(1);
}

const resolvedInput = path.resolve(inputPath);
if (!fs.existsSync(resolvedInput)) {
  console.error(`エラー: ファイルが見つかりません: ${resolvedInput}`);
  process.exit(1);
}

// ──────────────────────────────────────────────────────
// 環境変数チェック（API キーは存在確認のみ。コール直前にクライアント初期化）
// ──────────────────────────────────────────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('エラー: 環境変数 ANTHROPIC_API_KEY が設定されていません');
  console.error('  export ANTHROPIC_API_KEY="sk-ant-..."  を実行してから再試行してください');
  process.exit(1);
}

// ──────────────────────────────────────────────────────
// 出力先
// ──────────────────────────────────────────────────────
const outputPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(path.dirname(resolvedInput), 'script.json');

// ──────────────────────────────────────────────────────
// note 記事を読み込む
// ──────────────────────────────────────────────────────
const rawContent = fs.readFileSync(resolvedInput, 'utf-8');
const { data: frontmatter, content } = matter(rawContent);

const title = frontmatter.title || content.match(/^#\s+(.+)$/m)?.[1]?.trim() || '';
if (!title) {
  console.error('エラー: 記事のタイトルが見つかりません（H1 または frontmatter の title が必要）');
  process.exit(1);
}

console.log(`入力ファイル : ${resolvedInput}`);
console.log(`記事タイトル : ${title}`);
console.log(`出力先       : ${outputPath}`);
console.log('Claude API を呼び出し中...');

// ──────────────────────────────────────────────────────
// システムプロンプト
// ──────────────────────────────────────────────────────
const SYSTEM_PROMPT = `あなたは日本語 YouTube 動画の台本ディレクターです。
note 記事（Markdown）を受け取り、8〜12分の中尺解説動画の台本 JSON を出力してください。

## 台本 JSON スキーマ（必ずこの形式で出力）
{
  "episodeId": "ep<数字>",
  "title": "動画タイトル（SEO を意識した端的な表現・60文字以内）",
  "sourceArticle": "<元記事のファイル名>",
  "targetDurationMinutes": "9-11",
  "voice": "落ち着いた解説向き（VOICEVOX話者は別途選定）",
  "note": "台本の補足メモ",
  "chapters": [
    {
      "index": 1,
      "id": "hook",
      "heading": "章の見出し（スライドに表示する日本語タイトル・25文字以内）",
      "slideBullets": ["スライドに表示する箇条書き1（15文字以内）", "箇条書き2"],
      "narration": "この章のナレーション本文。話し言葉で自然に読み上げられる形にする。丁寧語（ですます調）で統一。",
      "clipMarker": false,
      "shortsClip": false
    }
  ]
}

## 制作ルール
- 章数は 7〜10 章（1章 = スライド1枚 = 音声1セグメント）
- 1章のナレーション目安: 400〜600 字（約1〜1.5分）
- slideBullets は 2〜4 項目。長い文章ではなくキーワード・短いフレーズ
- 話し言葉化: note の書き言葉を「ですます調」の自然な語り口に変換する
- 論理構造はそのまま活かす（改変・要約しすぎない）
- clipMarker: true は「実演クリップ差し込み予定」の章（映像で見せるべき場面）に付与。多くても1〜2章
- shortsClip: true は「Shorts 切り出し元」候補（最も言いたい1章）に1つだけ付与
- note の末尾CTA（製品誘導）は最終章に必ず含める
- JSON のみ出力すること（説明文・コードブロック記法 \`\`\`json ... \`\`\` は不要）`;

// ──────────────────────────────────────────────────────
// Claude API 呼び出し
// ──────────────────────────────────────────────────────
async function generateScript() {
  const client = new Anthropic();

  const userMessage = `以下の note 記事を YouTube 動画台本 JSON に変換してください。
元記事パス: ${path.relative(process.cwd(), resolvedInput)}

---
${content.trim()}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userMessage },
    ],
  });

  const rawJson = response.content[0]?.text?.trim();
  if (!rawJson) {
    throw new Error('Claude API からの応答が空でした');
  }

  // JSON パース検証
  let script;
  try {
    script = JSON.parse(rawJson);
  } catch (e) {
    // コードブロック記法が含まれていた場合のフォールバック
    const jsonMatch = rawJson.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (jsonMatch) {
      script = JSON.parse(jsonMatch[1].trim());
    } else {
      throw new Error(`JSON パースに失敗しました: ${e.message}\n---\n${rawJson.slice(0, 500)}`);
    }
  }

  if (!script.chapters || !Array.isArray(script.chapters)) {
    throw new Error('chapters フィールドが見つかりません');
  }

  // sourceArticle を設定（フロントマターの情報を優先）
  script.sourceArticle = script.sourceArticle || path.relative(process.cwd(), resolvedInput);

  // 出力ディレクトリを作成
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(script, null, 2), 'utf-8');

  console.log(`\n台本生成完了: ${outputPath}`);
  console.log(`  章数: ${script.chapters.length}`);
  console.log(`  タイトル: ${script.title}`);
  console.log(`  使用トークン: 入力 ${response.usage.input_tokens} / 出力 ${response.usage.output_tokens}`);

  return outputPath;
}

generateScript()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('エラー:', err.message);
    process.exit(1);
  });
