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
const BG_COLOR = "#FAF8F5";       // クリーム
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
  const escaped = escapeXml(title);
  const MAX_CHARS = 22;
  const lines = wrapText(title, MAX_CHARS);

  const FONT_SIZE = lines.length === 1 ? 56 : lines.length === 2 ? 48 : 40;
  const LINE_HEIGHT = FONT_SIZE * 1.5;
  const totalTextHeight = lines.length * LINE_HEIGHT;
  const textStartY = (HEIGHT - totalTextHeight) / 2 + FONT_SIZE * 0.35;

  const tspans = lines
    .map((line, i) => {
      const esc = escapeXml(line);
      const dy = i === 0 ? 0 : LINE_HEIGHT;
      return `<tspan x="128" dy="${dy}">${esc}</tspan>`;
    })
    .join("\n      ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <!-- 背景 -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG_COLOR}"/>

  <!-- 左端アクセントバー -->
  <rect x="0" y="0" width="8" height="${HEIGHT}" fill="${ACCENT_COLOR}"/>

  <!-- 右下装飾ドット -->
  <circle cx="${WIDTH - 80}" cy="${HEIGHT - 80}" r="6" fill="${ACCENT_COLOR}" opacity="0.25"/>
  <circle cx="${WIDTH - 56}" cy="${HEIGHT - 80}" r="6" fill="${ACCENT_COLOR}" opacity="0.15"/>
  <circle cx="${WIDTH - 80}" cy="${HEIGHT - 56}" r="6" fill="${ACCENT_COLOR}" opacity="0.15"/>

  <!-- 左上タグ -->
  <rect x="56" y="56" width="100" height="32" rx="4" fill="${ACCENT_COLOR}" opacity="0.12"/>
  <text x="106" y="77" font-family="Noto Sans JP, Hiragino Sans, sans-serif"
        font-size="14" fill="${ACCENT_COLOR}" text-anchor="middle" font-weight="600">keyaki</text>

  <!-- タイトル -->
  <text
    x="128"
    y="${textStartY}"
    font-family="Noto Sans JP, Hiragino Sans, sans-serif"
    font-size="${FONT_SIZE}"
    fill="${TEXT_COLOR}"
    font-weight="700"
    line-spacing="${LINE_HEIGHT}"
  >
      ${tspans}
  </text>

  <!-- 下部区切り線 -->
  <line x1="56" y1="${HEIGHT - 60}" x2="${WIDTH - 56}" y2="${HEIGHT - 60}"
        stroke="${TEXT_COLOR}" stroke-width="1" opacity="0.08"/>

  <!-- 下部サブテキスト -->
  <text x="64" y="${HEIGHT - 32}"
        font-family="Noto Sans JP, Hiragino Sans, sans-serif"
        font-size="16" fill="${SUBTEXT_COLOR}">keyaki-dev.com</text>
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
