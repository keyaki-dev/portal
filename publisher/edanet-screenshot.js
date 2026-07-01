const { chromium } = require('playwright');
const path = require('path');

const OUTPUT_DIR = '/home/yamashita/keyaki/portal/documents/edanet/screenshots';
const DATE = '20260614';
const BASE_URL = 'https://edanet.keyaki-dev.com';

// Known post IDs from API
const POST_ID = '09ab3b04-e4fc-44ef-95aa-3e91fbaca5c8';  // idea 投稿

async function take(page, url, filename, opts = {}) {
  const { waitMs = 2500, fullPage = false } = opts;
  console.log(`→ ${filename}: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(waitMs);
    const finalUrl = page.url();
    console.log(`  Final URL: ${finalUrl}`);
    const outPath = path.join(OUTPUT_DIR, `${filename}-${DATE}.png`);
    await page.screenshot({ path: outPath, fullPage });
    console.log(`  Saved (${(require('fs').statSync(outPath).size / 1024).toFixed(0)} KB)`);
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // 1. ランディング（/ → /landing へリダイレクト）
  await take(page, `${BASE_URL}/`, 'edanet-landing', { waitMs: 3000 });

  // 2. フィード
  await take(page, `${BASE_URL}/feed`, 'edanet-feed', { waitMs: 2500 });

  // 3. 投稿作成
  await take(page, `${BASE_URL}/create`, 'edanet-create', { waitMs: 2500 });

  // 4. 投稿詳細（実際の UUID を使用）
  await take(page, `${BASE_URL}/post/${POST_ID}`, 'edanet-post', { waitMs: 3000 });

  // 5. 系譜ビュー（genealogy/[id]）
  await take(page, `${BASE_URL}/genealogy/${POST_ID}`, 'edanet-genealogy', { waitMs: 3000 });

  await browser.close();
  console.log('\nAll done!');
})();
