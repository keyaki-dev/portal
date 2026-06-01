// blog/.md ファイルのフロントマターに published_url と 2_published フラグを追記する
const matter = require("gray-matter");
const fs = require("fs");
const path = require("path");

const BLOG_DIR = process.env.BLOG_DIR || path.join(__dirname, "../blog");
const filename = process.argv[2];
const noteUrl = process.argv[3];

if (!filename || !noteUrl) {
  console.error("使い方: node update-frontmatter.js <filename> <note_url>");
  process.exit(1);
}

const filePath = path.join(BLOG_DIR, filename);
const raw = fs.readFileSync(filePath, "utf-8");
const { data, content } = matter(raw);

// フラグを更新
const flags = Array.isArray(data.flags) ? [...data.flags] : [];
if (!flags.includes("2_published")) {
  // 1_draft を残しつつ 2_published を追加
  flags.push("2_published");
}
data.flags = flags;
data.published_url = noteUrl;

const updated = matter.stringify(content, data);
fs.writeFileSync(filePath, updated, "utf-8");
console.log(`更新完了: ${filename}`);
