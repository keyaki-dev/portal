// Note.com へ記事を自動投稿するスクリプト
// 環境変数: NOTE_EMAIL, NOTE_PASSWORD, BLOG_DIR
// 引数: filename (blog/ディレクトリ内のファイル名)
// 出力: GitHub Actions の output として note_url を設定

const { chromium } = require("playwright");
const matter = require("gray-matter");
const fs = require("fs");
const path = require("path");

const BLOG_DIR = process.env.BLOG_DIR || path.join(__dirname, "../blog");
const NOTE_EMAIL = process.env.NOTE_EMAIL;
const NOTE_PASSWORD = process.env.NOTE_PASSWORD;
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
  if (!NOTE_EMAIL || !NOTE_PASSWORD) throw new Error("NOTE_EMAIL / NOTE_PASSWORD が未設定です");

  console.log(`投稿開始: ${title}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });
  const page = await context.newPage();

  const screenshotDir = process.env.GITHUB_WORKSPACE || "/tmp";

  try {
    // ログイン
    console.log("Note にログイン中...");
    await page.goto("https://note.com/login", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/note-login.png` });

    // メールアドレス入力（複数セレクタを順に試す）
    const emailSelectors = [
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="メール"]',
      'input[placeholder*="email"]',
      '#email',
      '[data-testid="email"]',
      'form input:first-of-type',
    ];
    let emailFilled = false;
    for (const sel of emailSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        await page.fill(sel, NOTE_EMAIL);
        emailFilled = true;
        console.log(`メール入力完了 (${sel})`);
        break;
      } catch {}
    }
    if (!emailFilled) {
      await page.screenshot({ path: `${screenshotDir}/note-login-failed.png` });
      throw new Error("メール入力欄が見つかりません。note-login-failed.png を確認してください");
    }

    // パスワード入力
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      '[data-testid="password"]',
    ];
    let passwordFilled = false;
    for (const sel of passwordSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        await page.fill(sel, NOTE_PASSWORD);
        passwordFilled = true;
        console.log(`パスワード入力完了 (${sel})`);
        break;
      } catch {}
    }
    if (!passwordFilled) {
      await page.screenshot({ path: `${screenshotDir}/note-login-failed.png` });
      throw new Error("パスワード入力欄が見つかりません");
    }

    // ログインボタンをクリック
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("ログイン")',
      'input[type="submit"]',
      '[data-testid="login-button"]',
      'form button',
    ];
    let submitClicked = false;
    for (const sel of submitSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        await page.click(sel);
        submitClicked = true;
        console.log(`ログインボタンクリック (${sel})`);
        break;
      } catch {}
    }
    if (!submitClicked) {
      await page.screenshot({ path: `${screenshotDir}/note-login-failed.png` });
      throw new Error("ログインボタンが見つかりません");
    }

    await page.waitForURL((url) => !url.href.includes("/login"), { timeout: 15000 });
    console.log("ログイン完了");

    // 新規記事ページへ
    await page.goto("https://note.com/notes/new", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // タイトル入力
    const titleSelectors = [
      '[data-placeholder="タイトル"]',
      '[placeholder="タイトル"]',
      ".note-title-input",
      "[data-testid='title']",
      "h1[contenteditable]",
      "div[role='textbox']:first-of-type",
    ];

    let titleFilled = false;
    for (const sel of titleSelectors) {
      try {
        const el = await page.waitForSelector(sel, { timeout: 3000 });
        if (el) {
          await el.click();
          await page.keyboard.type(title);
          titleFilled = true;
          console.log(`タイトル入力完了 (selector: ${sel})`);
          break;
        }
      } catch {}
    }

    if (!titleFilled) {
      // スクリーンショットを保存して確認用に
      await page.screenshot({ path: "/tmp/note-debug.png" });
      throw new Error("タイトル入力欄が見つかりません。/tmp/note-debug.png を確認してください");
    }

    // Tab で本文へ移動
    await page.keyboard.press("Tab");
    await page.waitForTimeout(500);

    // 本文入力
    const bodySelectors = [
      '[data-placeholder="本文を入力してください"]',
      ".note-body-input",
      "[data-testid='body']",
      "div[role='textbox']:nth-of-type(2)",
    ];

    let bodyFilled = false;
    for (const sel of bodySelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.click();
          // クリップボード経由でペースト（長文対応）
          await page.evaluate((text) => {
            navigator.clipboard?.writeText(text).catch(() => {});
          }, body);
          await page.keyboard.press("Control+v");
          bodyFilled = true;
          console.log(`本文入力完了 (selector: ${sel})`);
          break;
        }
      } catch {}
    }

    if (!bodyFilled) {
      // フォーカスされている場所に直接タイプ（Tab 後の状態を利用）
      await page.keyboard.type(body, { delay: 5 });
      console.log("本文を直接タイプしました");
    }

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

    // 投稿ボタンをクリック
    const publishSelectors = [
      "button:has-text('投稿する')",
      "button:has-text('公開する')",
      "[data-testid='publish-button']",
      ".publish-button",
    ];

    let published = false;
    for (const sel of publishSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          published = true;
          console.log(`投稿ボタンクリック (selector: ${sel})`);
          break;
        }
      } catch {}
    }

    if (!published) {
      await page.screenshot({ path: "/tmp/note-before-publish.png" });
      throw new Error("投稿ボタンが見つかりません。/tmp/note-before-publish.png を確認してください");
    }

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
      // 即時投稿の確認ダイアログ
      try {
        const confirmBtn = await page.$("button:has-text('公開する')");
        if (confirmBtn) {
          await confirmBtn.click();
          console.log("公開確認ダイアログで公開ボタンをクリック");
        }
      } catch {}
    }

    // URL 取得
    await page.waitForTimeout(3000);
    const finalUrl = page.url();
    console.log(`投稿完了: ${finalUrl}`);

    // Note の記事URLかどうか確認
    if (finalUrl.includes("note.com") && finalUrl.includes("/n/")) {
      setOutput("note_url", finalUrl);
    } else {
      console.warn(`警告: 予期しないURL: ${finalUrl}`);
      setOutput("note_url", finalUrl);
    }

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
