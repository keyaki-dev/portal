// Note.com へ記事を投稿するスクリプト
// 環境変数: NOTE_SESSION, BLOG_DIR, COVER_IMAGE, SCHEDULED_AT, AUTO_HEADER
// 引数: filename (blog/ディレクトリ内のファイル名)
// 出力: GitHub Actions の output として note_url を設定（公開設定ページのURL）
//
// AUTO_HEADER=1 を設定すると generate-note-header.js でヘッダー画像を自動生成して
// カバー画像としてセットする（COVER_IMAGE 未指定時）。

const { chromium } = require("playwright");
const matter = require("gray-matter");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const BLOG_DIR = process.env.BLOG_DIR || path.join(__dirname, "../blog");
const NOTE_SESSION = process.env.NOTE_SESSION;
let COVER_IMAGE = process.env.COVER_IMAGE || "";
const SCHEDULED_AT = process.env.SCHEDULED_AT || "";
const AUTO_HEADER = process.env.AUTO_HEADER === "1";

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
  const { data, content } = matter(raw);
  const h1Title = extractTitle(content);
  const title = h1Title || data.title || "";
  const body = h1Title ? removeH1(content) : content;
  const tags = Array.isArray(data.blog_tag) ? data.blog_tag : (Array.isArray(data.tags) ? data.tags : []);

  if (!title) throw new Error("タイトルが見つかりません（H1 または front matter の title が必要）");
  if (!NOTE_SESSION) throw new Error("NOTE_SESSION が未設定です");

  // AUTO_HEADER=1 かつ COVER_IMAGE 未指定の場合はヘッダー画像を自動生成
  if (AUTO_HEADER && !COVER_IMAGE) {
    try {
      const headerPath = `/tmp/note-header-${Date.now()}.png`;
      const genScript = path.join(__dirname, "generate-note-header.js");
      execSync(`node "${genScript}" "${title.replace(/"/g, '\\"')}" "${headerPath}"`, { stdio: "inherit" });
      if (fs.existsSync(headerPath)) {
        COVER_IMAGE = headerPath;
        console.log(`ヘッダー画像を自動生成しました: ${headerPath}`);
      }
    } catch (e) {
      console.warn("ヘッダー画像の自動生成に失敗しました（続行）:", e.message);
    }
  }

  console.log(`投稿開始: ${title}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });

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

  try {
    // 新規記事ページへ
    await page.goto("https://note.com/notes/new", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // タイトル入力（textarea）
    const titleInput = page.locator('textarea[placeholder="記事タイトル"]').first();
    await titleInput.waitFor({ timeout: 10000 });
    await titleInput.fill(title);
    console.log("タイトル入力完了");
    await page.waitForTimeout(300);

    // 本文入力（ProseMirrorエディタ）— paste イベント経由で確実に挿入
    const proseMirror = page.locator("div.ProseMirror").first();
    await proseMirror.waitFor({ timeout: 10000 });
    await proseMirror.click();
    await page.waitForTimeout(500);
    // ProseMirror は paste イベントを処理するため ClipboardEvent で挿入
    const inserted = await page.evaluate((text) => {
      const el = document.querySelector("div.ProseMirror");
      if (!el) return false;
      el.focus();
      const data = new DataTransfer();
      data.setData("text/plain", text);
      el.dispatchEvent(new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }));
      return true;
    }, body);
    if (!inserted) throw new Error("ProseMirror エディタが見つかりませんでした");
    console.log("本文入力完了（オートセーブ待機中...）");
    // note.com のオートセーブが完了するまで待機（約10秒）
    // オートセーブ前に「公開に進む」を押すと「タイトル、本文を入力してください」エラーが発生する
    await page.waitForTimeout(10000);

    // カバー画像のアップロード（2段階フロー）
    // Step1: カバー画像アイコン → Step2: 「画像をアップロード」メニュー → file input
    if (COVER_IMAGE && fs.existsSync(COVER_IMAGE)) {
      try {
        // Step1: タイトル上のカバー画像アイコン（aria-label="画像を追加"）をクリック
        const coverIconBtn = page.locator('[aria-label="画像を追加"]').first();
        if (await coverIconBtn.count() > 0) {
          await coverIconBtn.click();
          await page.waitForTimeout(800);
          console.log("カバー画像アイコンをクリックしました");

          // Step2: 展開されたメニューの「画像をアップロード」をクリック
          const uploadMenuItem = page.locator('button:has-text("画像をアップロード")').first();
          if (await uploadMenuItem.count() > 0) {
            await uploadMenuItem.click();
            await page.waitForTimeout(1000);
            console.log("「画像をアップロード」をクリックしました");
          }
        }

        // file input を待機（hidden 状態でも DOM 上に存在すれば取得）
        const fileInput = await page.waitForSelector(
          '#note-editor-eyecatch-input, input[type="file"][accept*="image"]',
          { timeout: 5000, state: "attached" }
        ).catch(() => null);

        if (fileInput) {
          await fileInput.setInputFiles(COVER_IMAGE);
          console.log("カバー画像をアップロードしました");
          await page.waitForTimeout(3000);

          // クロップダイアログの「保存」ボタンをクリックして確定
          // ReactModal__Overlay がオーバーレイするため .ReactModal__Content 内を検索 + force: true
          const cropSaveBtn = page.locator('.ReactModal__Content button:has-text("保存")').first();
          const cropSaveBtnFallback = page.locator('button:has-text("保存")').first();
          const btn = (await cropSaveBtn.count() > 0) ? cropSaveBtn : cropSaveBtnFallback;
          if (await btn.count() > 0) {
            await btn.click({ force: true });
            await page.waitForTimeout(1500);
            console.log("カバー画像を保存しました");
          }
        } else {
          console.warn("カバー画像の入力欄が見つかりませんでした（スキップ）");
        }
      } catch (e) {
        console.warn("カバー画像のアップロードに失敗しました（続行）:", e.message);
      }
    }

    // 「公開に進む」→ 公開設定ページへ
    await page.waitForSelector("button:has-text('公開に進む')", { timeout: 10000 });
    await page.click("button:has-text('公開に進む')");
    console.log("「公開に進む」クリック");
    await page.waitForTimeout(3500);

    // ハッシュタグを設定
    if (tags.length > 0) {
      try {
        const hashtagInput = page.locator('input[placeholder*="ハッシュタグ"]').first();
        await hashtagInput.waitFor({ timeout: 5000 });
        for (const tag of tags) {
          await hashtagInput.fill(tag);
          await page.keyboard.press("Enter");
          await page.waitForTimeout(300);
        }
        console.log(`タグを設定しました: ${tags.join(", ")}`);
      } catch (e) {
        console.warn("タグ設定に失敗しました（続行）:", e.message);
      }
    }

    // 予約投稿の処理（SCHEDULED_AT が指定されている場合のみ）
    if (SCHEDULED_AT) {
      try {
        const scheduleEl = await page.$("button:has-text('予約投稿'), label:has-text('予約投稿')");
        if (scheduleEl) {
          await scheduleEl.click();
          await page.waitForTimeout(1000);
          const date = new Date(SCHEDULED_AT);
          const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
          const dateStr = jst.toISOString().slice(0, 10);
          const timeStr = jst.toISOString().slice(11, 16);
          const dateInput = await page.$('input[type="date"]');
          if (dateInput) await dateInput.fill(dateStr);
          const timeInput = await page.$('input[type="time"]');
          if (timeInput) await timeInput.fill(timeStr);
          await page.waitForTimeout(500);
          for (const sel of ["button:has-text('予約投稿する')", "button:has-text('予約する')"]) {
            const btn = await page.$(sel);
            if (btn) { await btn.click(); console.log(`予約投稿確定 ${dateStr} ${timeStr} JST`); break; }
          }
        }
      } catch (e) {
        console.warn("予約投稿の設定に失敗しました:", e.message);
      }
    } else {
      // 即時公開：「投稿する」ボタンをクリック（複数バリアント対応）
      const publishLabels = ["投稿する", "公開する", "更新する", "投稿して公開", "公開設定を保存"];
      let publishClicked = false;
      for (const label of publishLabels) {
        const btn = page.locator(`button:has-text("${label}")`).first();
        if (await btn.count() > 0) {
          await btn.click();
          console.log(`「${label}」クリック`);
          publishClicked = true;
          break;
        }
      }
      if (!publishClicked) {
        // デバッグ: 利用可能なボタン一覧を出力
        const btns = await page.locator("button").all();
        const btnTexts = await Promise.all(btns.map(b => b.textContent()));
        console.log("利用可能なボタン:", btnTexts.filter(t => t && t.trim()).join(" / "));
        await page.screenshot({ path: "/tmp/note-publish-debug.png" });
        console.log("デバッグスクリーンショット: /tmp/note-publish-debug.png");
        throw new Error("投稿ボタンが見つかりませんでした");
      }
      await page.waitForTimeout(3000);

      // 「記事が公開されました」モーダルを待つ（なければURLから判定）
      const successMsg = await page.waitForSelector(
        "text=記事が公開されました, text=投稿しました",
        { timeout: 15000 }
      ).catch(() => null);
      if (successMsg) {
        console.log("投稿成功！");
      } else {
        console.log("成功モーダルなし（URLから判定）");
      }

      // editorのURLからnoteIDを取得して公開URLを構築
      const currentUrl = page.url();
      const noteId = currentUrl.match(/\/notes\/(n[a-z0-9]+)\//)?.[1];
      const publishedLink = await page.evaluate((nid) => {
        const ogUrl = document.querySelector('meta[property="og:url"]')?.content;
        if (ogUrl && ogUrl.includes("/n/")) return ogUrl;
        if (nid) {
          const link = document.querySelector(`a[href*="/${nid}"]`);
          if (link) return link.href;
        }
        return null;
      }, noteId);

      const finalUrl = publishedLink || (noteId ? `https://note.com/keyaki_dev/n/${noteId}` : currentUrl);
      console.log(`公開URL: ${finalUrl}`);
      setOutput("note_url", finalUrl);
      return finalUrl;
    }

    const fallbackUrl = page.url();
    return fallbackUrl;

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
