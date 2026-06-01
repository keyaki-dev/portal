/**
 * ビルド前にドキュメントキャッシュを生成するスクリプト。
 * Unicode ファイル名を base64url エンコードされた ASCII 名に変換して
 * .docs-cache/ に保存する。Vercel の outputFileTracingIncludes の
 * glob が Unicode ファイル名を正しく扱えない問題を回避する。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'documents');
const CACHE_DIR = path.join(ROOT, '.docs-cache');

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

fs.mkdirSync(CACHE_DIR, { recursive: true });

const files = walkDir(DOCS_DIR);
const index = [];

for (const { relativePath, fullPath, ext } of files) {
  const safeKey = Buffer.from(relativePath).toString('base64url');
  const content = fs.readFileSync(fullPath, 'utf-8');
  const stat = fs.statSync(fullPath);
  const type = ext === '.html' ? 'html' : 'md';
  const slug = relativePath.split('/');
  const folder = slug.length > 1 ? slug.slice(0, -1).join('/') : '';
  const basename = path.basename(relativePath, ext);

  let title = basename;
  if (type === 'md') {
    const frontmatterTitle = parseFrontmatterTitle(content);
    if (frontmatterTitle) title = frontmatterTitle;
  }

  // ドキュメントコンテンツを ASCII 名のファイルに保存
  fs.writeFileSync(
    path.join(CACHE_DIR, safeKey + '.json'),
    JSON.stringify({ content })
  );

  index.push({
    relativePath,
    safeKey,
    slug,
    title,
    type,
    folder,
    updatedAt: stat.mtime.toISOString().slice(0, 10),
  });
}

// getAllDocuments() と同じソート順
index.sort((a, b) => {
  if (a.folder !== b.folder) return a.folder.localeCompare(b.folder, 'ja');
  return a.title.localeCompare(b.title, 'ja');
});

fs.writeFileSync(path.join(CACHE_DIR, '_index.json'), JSON.stringify(index));
console.log(`✓ docs manifest: ${files.length} documents`);
