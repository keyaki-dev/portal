/**
 * ビルド前にドキュメントキャッシュを生成するスクリプト。
 * documents/ 配下を全スキャンして .docs-cache/all.json に書き出す。
 * webpack がビルド時に JSON をバンドルするため、Vercel の Unicode 問題を回避できる。
 * コンテンツは base64url の safeKey で索引付けする（URL にも使用）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'documents');
const CACHE_FILE = path.join(ROOT, '.docs-cache', 'all.json');

function walkDir(dir, base = dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, base));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext !== '.md' && ext !== '.html') continue;
      const relativePath = path.relative(base, fullPath).replace(/\\/g, '/');
      results.push({ relativePath, fullPath, ext });
    }
  }
  return results;
}

function parseFrontmatterTitle(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const t = m[1].match(/^title:\s*(.+)$/m);
  return t ? t[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });

const files = walkDir(DOCS_DIR);
const index = [];
const content = {};

for (const { relativePath, fullPath, ext } of files) {
  const safeKey = Buffer.from(relativePath).toString('base64url');
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const stat = fs.statSync(fullPath);
  const type = ext === '.html' ? 'html' : 'md';
  const slug = relativePath.split('/');
  const folder = slug.length > 1 ? slug.slice(0, -1).join('/') : '';
  const basename = path.basename(relativePath, ext);

  let title = basename;
  if (type === 'md') {
    const frontmatterTitle = parseFrontmatterTitle(raw);
    if (frontmatterTitle) title = frontmatterTitle;
  }

  // コンテンツは safeKey で索引付け（ASCII キーなので比較が確実）
  content[safeKey] = raw;
  const jst = new Date(stat.mtime.getTime() + 9 * 60 * 60 * 1000);
  const updatedAt = jst.toISOString().slice(0, 16).replace('T', ' ');
  index.push({ safeKey, relativePath, slug, title, type, folder, updatedAt });
}

index.sort((a, b) => {
  if (a.folder !== b.folder) return a.folder.localeCompare(b.folder, 'ja');
  return a.title.localeCompare(b.title, 'ja');
});

fs.writeFileSync(CACHE_FILE, JSON.stringify({ index, content }));
console.log(`✓ docs manifest: ${files.length} documents → .docs-cache/all.json`);
