// note ヘッダー画像生成スクリプト
// Warm Minimalist カラー体系に基づく 1280×670px PNG を生成する
// 使い方: node generate-note-header.js "タイトル文字列" [出力パス]
// 出力パス省略時: /tmp/note-header.png

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const WIDTH = 1280;
const HEIGHT = 670;

// Warm Minimalist カラー体系
const ACCENT_COLOR = "#C45E3E";   // テラコッタ
const TEXT_COLOR = "#2D2A27";     // チャコール
const SUBTEXT_COLOR = "#8C7B6E";  // ミューテッドブラウン

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text, maxCharsPerLine) {
  const lines = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxCharsPerLine) {
      lines.push(remaining);
      break;
    }
    // 句読点・スペースで折り返せる位置を優先
    let breakAt = maxCharsPerLine;
    for (let i = maxCharsPerLine; i > maxCharsPerLine * 0.6; i--) {
      const ch = remaining[i];
      if (ch === "。" || ch === "、" || ch === " " || ch === "　" || ch === "・") {
        breakAt = i + 1;
        break;
      }
    }
    lines.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt);
  }
  return lines;
}

function buildSvg(title) {
  const MAX_CHARS = 20;
  const lines = wrapText(title, MAX_CHARS);

  const FONT_SIZE = lines.length === 1 ? 64 : lines.length === 2 ? 54 : 44;
  const LINE_HEIGHT = FONT_SIZE * 1.6;
  const totalTextHeight = lines.length * LINE_HEIGHT;
  // タイトルを上寄り中央に配置（右下装飾と干渉しないよう上限を設ける）
  const textStartY = Math.min((HEIGHT - totalTextHeight) / 2 + FONT_SIZE * 0.35, HEIGHT * 0.55);

  const tspans = lines
    .map((line, i) => {
      const esc = escapeXml(line);
      const dy = i === 0 ? 0 : LINE_HEIGHT;
      return `<tspan x="100" dy="${dy}">${esc}</tspan>`;
    })
    .join("\n      ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <!-- 背景グラデーション: クリームから薄いオレンジ -->
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FAF8F5"/>
      <stop offset="100%" stop-color="#FEF0E6"/>
    </linearGradient>
    <!-- アクセント円グラデーション -->
    <radialGradient id="circleGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${ACCENT_COLOR}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${ACCENT_COLOR}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- 背景グラデーション -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)"/>

  <!-- 右上の大きな装飾円（ブランドカラー） -->
  <circle cx="${WIDTH + 60}" cy="-60" r="400" fill="url(#circleGrad)"/>
  <circle cx="${WIDTH - 60}" cy="${HEIGHT / 2 - 40}" r="220" fill="${ACCENT_COLOR}" opacity="0.04"/>

  <!-- 左端アクセントバー（太め） -->
  <rect x="0" y="0" width="12" height="${HEIGHT}" fill="${ACCENT_COLOR}"/>

  <!-- 上部ブランドライン -->
  <line x1="52" y1="70" x2="420" y2="70" stroke="${ACCENT_COLOR}" stroke-width="1.5" opacity="0.25"/>

  <!-- ブランドラベル（大文字・トラッキング） -->
  <text x="60" y="56" font-family="Noto Sans JP, Hiragino Sans, sans-serif"
        font-size="12" fill="${ACCENT_COLOR}" font-weight="700" letter-spacing="4">KEYAKI</text>

  <!-- タイトル（大きく・左揃え） -->
  <text
    x="100"
    y="${textStartY}"
    font-family="Noto Sans JP, Hiragino Sans, sans-serif"
    font-size="${FONT_SIZE}"
    fill="${TEXT_COLOR}"
    font-weight="700"
  >
      ${tspans}
  </text>

  <!-- 下部区切り線 -->
  <line x1="52" y1="${HEIGHT - 60}" x2="${WIDTH - 52}" y2="${HEIGHT - 60}"
        stroke="${TEXT_COLOR}" stroke-width="1" opacity="0.06"/>

  <!-- 右下ドメイン -->
  <text x="${WIDTH - 60}" y="${HEIGHT - 32}"
        font-family="Noto Sans JP, Hiragino Sans, sans-serif"
        font-size="15" fill="${SUBTEXT_COLOR}" text-anchor="end" letter-spacing="1">keyaki-dev.com</text>

  <!-- 右下アクセントドット -->
  <circle cx="60" cy="${HEIGHT - 36}" r="4" fill="${ACCENT_COLOR}" opacity="0.45"/>
  <circle cx="76" cy="${HEIGHT - 36}" r="4" fill="${ACCENT_COLOR}" opacity="0.25"/>
  <circle cx="92" cy="${HEIGHT - 36}" r="4" fill="${ACCENT_COLOR}" opacity="0.12"/>
</svg>`;
}

async function generateHeader(title, outputPath) {
  if (!title) {
    console.error("タイトルを指定してください");
    process.exit(1);
  }

  const out = outputPath || "/tmp/note-header.png";
  const svgBuffer = Buffer.from(buildSvg(title), "utf-8");

  await sharp(svgBuffer)
    .png()
    .toFile(out);

  console.log(`ヘッダー画像を生成しました: ${out}`);
  return out;
}

const title = process.argv[2];
const outputPath = process.argv[3] || "/tmp/note-header.png";

generateHeader(title, outputPath)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("エラー:", err.message);
    process.exit(1);
  });
