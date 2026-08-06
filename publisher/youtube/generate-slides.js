// YouTube スライド PNG 生成スクリプト（②スライド生成）
// script.json を読み込み、各章のスライドを 1920×1080 PNG で出力する
// 使い方: node generate-slides.js <script.jsonのパス> [出力先ディレクトリ]
// 出力先省略時: publisher/youtube/output/<episodeId>/slides/
// 依存: playwright (publisher/package.json に導入済み)

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright');

// ──────────────────────────────────────────────────────
// ヘルプ
// ──────────────────────────────────────────────────────
if (process.argv[2] === '--help' || process.argv[2] === '-h') {
  console.log(`
使い方:
  node generate-slides.js <script.jsonのパス> [出力先ディレクトリ]

  <script.jsonのパス>      generate-script.js で生成した台本 JSON (必須)
  [出力先ディレクトリ]     PNG の保存先 (省略時: publisher/youtube/output/<episodeId>/slides/)

例:
  node generate-slides.js ../../docs/03_マーケティング/youtube/episode1/script.json
  node generate-slides.js script.json ./output/ep1/slides/

出力:
  slide-01.png, slide-02.png ... (各章のスライドを 1920×1080 PNG で保存)
`);
  process.exit(0);
}

// ──────────────────────────────────────────────────────
// 引数チェック
// ──────────────────────────────────────────────────────
const scriptPath = process.argv[2];
if (!scriptPath) {
  console.error('エラー: script.json のパスを指定してください');
  console.error('  node generate-slides.js <script.jsonのパス> [出力先ディレクトリ]');
  console.error('  node generate-slides.js --help でヘルプを表示');
  process.exit(1);
}

const resolvedScript = path.resolve(scriptPath);
if (!fs.existsSync(resolvedScript)) {
  console.error(`エラー: ファイルが見つかりません: ${resolvedScript}`);
  process.exit(1);
}

// ──────────────────────────────────────────────────────
// script.json を読み込む
// ──────────────────────────────────────────────────────
let script;
try {
  script = JSON.parse(fs.readFileSync(resolvedScript, 'utf-8'));
} catch (e) {
  console.error(`エラー: JSON のパースに失敗しました: ${e.message}`);
  process.exit(1);
}

if (!script.chapters || !Array.isArray(script.chapters) || script.chapters.length === 0) {
  console.error('エラー: script.json に chapters が含まれていません');
  process.exit(1);
}

const episodeId = script.episodeId || 'ep0';

// 出力ディレクトリ
const outputDir = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(__dirname, 'output', episodeId, 'slides');

// ──────────────────────────────────────────────────────
// HTML エスケープ
// ──────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ──────────────────────────────────────────────────────
// 1章分のスタンドアロン HTML を生成する
// Warm Minimalist デザイントークン（slide-template.html から流用）
// ──────────────────────────────────────────────────────
function buildSlideHtml(chapter, episodeTitle) {
  const chapterLabel = `Chapter ${String(chapter.index).padStart(2, '0')}`;
  const headingHtml = escapeHtml(chapter.heading);

  const bulletsHtml = (chapter.slideBullets || [])
    .map(b => `<li>${escapeHtml(b)}</li>`)
    .join('\n          ');

  // clipMarker バッジ（実演クリップ差し込み予定章）
  const clipBadgeHtml = chapter.clipMarker
    ? `<div class="clip-badge">
        <span class="clip-icon">&#9654;</span>
        実演クリップ差し込み予定
      </div>`
    : '';

  // Shorts バッジ
  const shortsBadgeHtml = chapter.shortsClip
    ? `<div class="shorts-badge">Shorts</div>`
    : '';

  // 紙テクスチャ（slide-template.html の ::after と同一の SVG）
  const TEXTURE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(chapter.heading)} — ${escapeHtml(episodeTitle)}</title>
<style>
/* ── Design Tokens (Warm Minimalist / slide-template.html 準拠) ── */
:root {
  --bg:          #F8F5F1;
  --bg-card:     #FDFAF7;
  --bg-muted:    #F2EDE8;
  --fg:          #2C2C2C;
  --fg-muted:    #6B6560;
  --border:      #E5DDD6;
  --accent:      #C45E3E;
  --accent-soft: #F5E1D6;
  --yellow:      #8A6A2E;
  --yellow-soft: #F5EDD6;
  --font-sans:   'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Segoe UI', system-ui, sans-serif;
  --font-serif:  'Hiragino Mincho ProN', 'Yu Mincho', Georgia, serif;
  --font-mono:   'Fira Code', 'Geist Mono', monospace;
}

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--fg);
  -webkit-font-smoothing: antialiased;
}

/* ── スライド全体 ── */
.slide {
  position: relative;
  width: 1920px;
  height: 1080px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 80px 160px 80px 180px;
  overflow: hidden;
}

/* 左端アクセントバー */
.left-bar {
  position: absolute;
  left: 0; top: 0;
  width: 16px; height: 100%;
  background: var(--accent);
}

/* 右上の装飾円（背景グラデーション） */
.deco-circle {
  position: absolute;
  top: -160px; right: -160px;
  width: 640px; height: 640px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(196,94,62,0.07) 0%, transparent 70%);
  pointer-events: none;
}

/* 紙テクスチャオーバーレイ */
.texture {
  position: absolute;
  inset: 0;
  background-image: ${TEXTURE_SVG};
  opacity: 0.025;
  pointer-events: none;
}

/* ── ヘッダー（ブランドラベル） ── */
.brand-header {
  position: absolute;
  top: 44px; left: 48px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.brand-name {
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
}
.brand-line {
  width: 60px; height: 1.5px;
  background: var(--accent);
  opacity: 0.35;
}

/* ── フッター ── */
.footer {
  position: absolute;
  bottom: 36px;
  left: 48px; right: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.footer-episode {
  font-size: 15px;
  color: var(--fg-muted);
  opacity: 0.7;
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
  max-width: 1200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.footer-dots {
  display: flex; gap: 6px; align-items: center;
}
.footer-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.3;
}
.footer-dot.current { opacity: 1; }

/* ── コンテンツエリア ── */
.content {
  max-width: 1500px;
  width: 100%;
}

/* チャプターラベル */
.chapter-label {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 20px;
}

/* 見出し（note用より一回り大きく） */
.heading {
  font-family: var(--font-serif);
  font-size: 64px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--fg);
  margin-bottom: 36px;
}

/* 区切り線 */
.divider {
  width: 56px; height: 3px;
  background: var(--accent);
  border-radius: 2px;
  margin-bottom: 40px;
}

/* 箇条書き */
.bullet-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.bullet-list li {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  font-size: 30px;
  color: var(--fg-muted);
  line-height: 1.55;
}
.bullet-list li::before {
  content: '—';
  color: var(--accent);
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 28px;
}

/* ── clipMarker バッジ ── */
.clip-badge {
  position: absolute;
  top: 44px; right: 48px;
  background: var(--yellow-soft);
  border: 2px solid var(--yellow);
  border-radius: 12px;
  padding: 14px 24px;
  font-size: 17px;
  font-weight: 700;
  color: var(--yellow);
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 10px;
  line-height: 1.4;
}
.clip-icon {
  font-size: 20px;
  color: var(--yellow);
}

/* ── Shorts バッジ ── */
.shorts-badge {
  position: absolute;
  top: ${chapter.clipMarker ? '130px' : '44px'}; right: 48px;
  background: var(--accent);
  border-radius: 8px;
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
</style>
</head>
<body>
<div class="slide">
  <!-- 左アクセントバー -->
  <div class="left-bar"></div>
  <!-- 右上装飾円 -->
  <div class="deco-circle"></div>
  <!-- 紙テクスチャ -->
  <div class="texture"></div>

  <!-- ブランドヘッダー -->
  <div class="brand-header">
    <div class="brand-name">keyaki labs</div>
    <div class="brand-line"></div>
  </div>

  ${clipBadgeHtml}
  ${shortsBadgeHtml}

  <!-- メインコンテンツ -->
  <div class="content">
    <div class="chapter-label">${escapeHtml(chapterLabel)}</div>
    <h2 class="heading">${headingHtml}</h2>
    <div class="divider"></div>
    <ul class="bullet-list">
      ${bulletsHtml}
    </ul>
  </div>

  <!-- フッター -->
  <div class="footer">
    <div class="footer-episode">${escapeHtml(episodeTitle)}</div>
    <div class="footer-dots">
      <div class="footer-dot current"></div>
      <div class="footer-dot"></div>
      <div class="footer-dot"></div>
    </div>
  </div>
</div>
</body>
</html>`;
}

// ──────────────────────────────────────────────────────
// メイン処理
// ──────────────────────────────────────────────────────
async function generateSlides() {
  // 出力ディレクトリ作成
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`台本      : ${resolvedScript}`);
  console.log(`エピソード: ${script.title}`);
  console.log(`章数      : ${script.chapters.length}`);
  console.log(`出力先    : ${outputDir}`);
  console.log('Playwright を起動中...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 1920×1080 固定ビューポート
  await page.setViewportSize({ width: 1920, height: 1080 });

  const tempFiles = [];

  try {
    for (const chapter of script.chapters) {
      const slideNum = String(chapter.index).padStart(2, '0');
      const pngName = `slide-${slideNum}.png`;
      const pngPath = path.join(outputDir, pngName);

      // 一時 HTML ファイルに書き出す（file:// プロトコル経由でロード）
      const tmpHtml = path.join(os.tmpdir(), `slide-${episodeId}-${slideNum}-${Date.now()}.html`);
      const html = buildSlideHtml(chapter, script.title || '');
      fs.writeFileSync(tmpHtml, html, 'utf-8');
      tempFiles.push(tmpHtml);

      await page.goto(`file://${tmpHtml}`, { waitUntil: 'networkidle' });
      // フォント描画が確定するまで少し待つ
      await page.waitForTimeout(300);
      await page.screenshot({ path: pngPath, type: 'png' });

      console.log(`  [${slideNum}/${String(script.chapters.length).padStart(2, '0')}] ${pngName} — ${chapter.heading}`);
    }

    console.log(`\n完了: ${script.chapters.length} 枚の PNG を生成しました`);
    console.log(`  保存先: ${outputDir}`);
  } finally {
    await browser.close();

    // 一時 HTML ファイルを削除
    for (const tmp of tempFiles) {
      try { fs.unlinkSync(tmp); } catch (_) {}
    }
  }
}

generateSlides()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('エラー:', err.message);
    process.exit(1);
  });
