// Note.com へ記事を自動投稿するスクリプト
// 環境変数: NOTE_SESSION, BLOG_DIR
// 引数: filename (blog/ディレクトリ内のファイル名)
// 出力: GitHub Actions の output として note_url を設定

const { chromium } = require("playwright");
const matter = require("gray-matter");
const fs = require("fs");
const path = require("path");

const BLOG_DIR = process.env.BLOG_DIR || path.join(__dirname, "../blog");
const NOTE_SESSION = process.env.NOTE_SESSION;
const COVER_IMAGE = process.env.COVER_IMAGE || "";
const SCHEDULED_AT = process.env.SCHEDULED_AT || "";

function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function removeH1(content) {
  return content.replace(/^#\s+.+\n?/m, "").trim();
}

function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `${name}=${value}\n`);
  } else {
    console.log(`OUTPUT ${name}=${value}`);
  }
}

async function publishToNote(filename) {
  const filePath = path.join(BLOG_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`ファイルが見つかりません: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const { content } = matter(raw);
  const title = extractTitle(content);
  const body = removeH1(content);

  if (!title) throw new Error("タイトル (H1) が見つかりません");
  if (!NOTE_SESSION) throw new Error("NOTE_SESSION が未設定です");

  console.log(`投稿開始: ${title}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });

  // セッションクッキーをセットしてログインページをスキップ
  await context.addCookies([{
    name: "_note_session_v5",
    value: NOTE_SESSION,
    domain: "note.com",
    path: "/",
    httpOnly: true,
    secure: true,
  }]);
  console.log("セッションクッキーをセット");

  const page = await context.newPage();
  const screenshotDir = process.env.GITHUB_WORKSPACE || "/tmp";

  // execCommand('insertText') でテキストを入力する
  // keyboard.type / clipboard paste はReactのcontenteditable StateをUpdateしないケースがあるため
  async function insertText(locator, text) {
    await locator.click();
    await page.keyboard.press("Control+a");
    await locator.evaluate((el, t) => {
      el.focus();
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, t);
    }, text);
  }

  try {

    // 新規記事ページへ
    await page.goto("https://note.com/notes/new", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const editorFrame = page;

    // タイトル入力（textarea に fill）
    const titleInput = page.locator('textarea[placeholder="記事タイトル"]').first();
    await titleInput.waitFor({ timeout: 10000 });
    await titleInput.fill(title);
    console.log("タイトル入力完了");
    await page.waitForTimeout(300);

    // 本文入力（ProseMirrorエディタをクリックしてキーボード入力）
    const proseMirror = page.locator("div.ProseMirror").first();
    await proseMirror.waitFor({ timeout: 10000 });
    await proseMirror.click();
    await page.waitForTimeout(300);
    await page.keyboard.type(body, { delay: 0 });
    console.log("本文入力完了");

    await page.waitForTimeout(1000);

    // カバー画像のアップロード
    if (COVER_IMAGE && fs.existsSync(COVER_IMAGE)) {
      try {
        // 直接 input[type=file] が見つかる場合
        const directInput = await page.$('input[type="file"][accept*="image"]');
        if (directInput) {
          await directInput.setInputFiles(COVER_IMAGE);
          console.log("カバー画像をアップロードしました（直接input）");
          await page.waitForTimeout(2000);
        } else {
          // カバー画像ボタンをクリックして file input を起動
          const coverBtnSelectors = [
            "button:has-text('カバー画像')",
            "[data-testid='add-cover-image']",
            "[aria-label*='カバー']",
          ];
          for (const sel of coverBtnSelectors) {
            try {
              const btn = await page.$(sel);
              if (btn) {
                await btn.click();
                await page.waitForTimeout(500);
                const fileInput = await page.$('input[type="file"]');
                if (fileInput) {
                  await fileInput.setInputFiles(COVER_IMAGE);
                  console.log(`カバー画像をアップロードしました (${sel})`);
                  await page.waitForTimeout(2000);
                }
                break;
              }
            } catch {}
          }
        }
      } catch (e) {
        console.warn("カバー画像のアップロードに失敗しました（続行）:", e.message);
      }
    }

    // 「公開に進む」ボタンをクリック
    await page.waitForSelector("button:has-text('公開に進む')", { timeout: 10000 });
    await page.click("button:has-text('公開に進む')");
    console.log("「公開に進む」クリック");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/note-before-publish.png` });

    await page.waitForTimeout(2000);

    // 予約投稿の処理
    if (SCHEDULED_AT) {
      try {
        const scheduleSelectors = [
          "button:has-text('予約投稿')",
          "label:has-text('予約投稿')",
          "[data-testid='schedule-publish']",
        ];
        let scheduleClicked = false;
        for (const sel of scheduleSelectors) {
          try {
            const el = await page.$(sel);
            if (el) {
              await el.click();
              scheduleClicked = true;
              console.log(`予約投稿を選択 (${sel})`);
              await page.waitForTimeout(1000);
              break;
            }
          } catch {}
        }

        if (scheduleClicked) {
          // JST に変換して日付・時刻を設定
          const date = new Date(SCHEDULED_AT);
          const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
          const dateStr = jst.toISOString().slice(0, 10);
          const timeStr = jst.toISOString().slice(11, 16);

          const dateInput = await page.$('input[type="date"]');
          if (dateInput) { await dateInput.fill(dateStr); }
          const timeInput = await page.$('input[type="time"]');
          if (timeInput) { await timeInput.fill(timeStr); }

          await page.waitForTimeout(500);

          // 予約確定ボタン
          const confirmSelectors = [
            "button:has-text('予約投稿する')",
            "button:has-text('予約する')",
            "button:has-text('設定する')",
          ];
          for (const sel of confirmSelectors) {
            try {
              const btn = await page.$(sel);
              if (btn) { await btn.click(); console.log(`予約投稿確定 ${dateStr} ${timeStr} JST`); break; }
            } catch {}
          }
        }
      } catch (e) {
        console.warn("予約投稿の設定に失敗しました。即時投稿を続行します:", e.message);
        // 即時投稿へフォールバック
        try {
          const confirmBtn = await page.$("button:has-text('公開する')");
          if (confirmBtn) { await confirmBtn.click(); }
        } catch {}
      }
    } else {
      // 公開設定ページの「投稿する」ボタンをクリック
      try {
        await page.waitForSelector("button:has-text('投稿する')", { timeout: 10000 });
        await page.click("button:has-text('投稿する')");
        console.log("「投稿する」クリック");
        // 「記事が公開されました」モーダルを待つ
        await page.waitForSelector("text=記事が公開されました", { timeout: 15000 });
        console.log("投稿成功！");

        // editorのURLからnoteIDを取得して公開URLを構築
        const currentUrl = page.url();
        const noteId = currentUrl.match(/\/notes\/(n[a-z0-9]+)\//)?.[1];

        // モーダルのDOMから実際の公開URLを探す（share buttonのhrefなど）
        const publishedLink = await page.evaluate((nid) => {
          // og:urlメタタグがあれば使う
          const ogUrl = document.querySelector('meta[property="og:url"]')?.content;
          if (ogUrl && ogUrl.includes("/n/")) return ogUrl;
          // noteIDを含むaタグを探す（infoや公式以外のユーザー記事）
          if (nid) {
            const link = document.querySelector(`a[href*="/${nid}"]`);
            if (link) return link.href;
          }
          return null;
        }, noteId);

        const finalPublishedUrl = publishedLink || (noteId ? `https://note.com/keyaki_dev/n/${noteId}` : currentUrl);
        console.log(`公開URL: ${finalPublishedUrl}`);
        setOutput("note_url", finalPublishedUrl);
        return finalPublishedUrl;
      } catch (e) {
        console.warn("投稿またはURL取得に失敗:", e.message);
        await page.screenshot({ path: `${screenshotDir}/note-before-publish.png` });
      }
    }

    // URL取得はスケジュール投稿時のフォールバック
    const finalUrl = page.url();
    return finalUrl;
  } finally {
    await browser.close();
  }
}

const filename = process.argv[2];
if (!filename) {
  console.error("使い方: node publish-note.js <filename>");
  process.exit(1);
}

publishToNote(filename)
  .then((url) => {
    console.log("完了:", url);
    process.exit(0);
  })
  .catch((err) => {
    console.error("エラー:", err.message);
    process.exit(1);
  });
