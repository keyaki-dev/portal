// Note.com へ記事を「下書き」として投稿するスクリプト
// 公開（投稿する操作）は行わない。実際の公開は note.com UI から手動で行う運用。
// 環境変数: NOTE_SESSION, BLOG_DIR, COVER_IMAGE, AUTO_HEADER
// 引数: filename (blog/ディレクトリ内のファイル名)
// 出力: GitHub Actions の output として note_url を設定（下書きの編集ページURL）
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
const AUTO_HEADER = process.env.AUTO_HEADER === "1";

function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function removeH1(content) {
  return content.replace(/^#\s+.+\n?/m, "").trim();
}

// markdown を note.com 向けに正規化する
// ① HTML コメント内のスライドURLを可視テキストに変換
// ② 連続3行以上の空行を2行に圧縮（note.com の行間過多を防ぐ）
function normalizeForNote(text) {
  text = text.replace(
    /<!--\s*slide:\s*(https?:\/\/\S+)\s*-->/g,
    (_, url) => `スライド（2分）: ${url}`
  );
  text = text.replace(/\n{3,}/g, "\n\n");
  return text;
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
  const rawBody = h1Title ? removeH1(content) : content;
  const body = normalizeForNote(rawBody);
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
    // ProseMirror の内容が反映されるまで待つ（最大20秒）
    // オートセーブ前に「公開に進む」を押すと「タイトル、本文を入力してください」エラーが発生する
    try {
      await page.waitForFunction(() => {
        const pm = document.querySelector("div.ProseMirror");
        return pm && pm.textContent.trim().length > 10;
      }, { timeout: 15000 });
      console.log("ProseMirror に本文が反映されました");
      await page.waitForTimeout(8000); // オートセーブ完了の追加待機
    } catch (e) {
      console.warn("ProseMirror 反映確認タイムアウト（続行）");
      await page.waitForTimeout(20000);
    }

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
            // カバー画像保存後に十分待機（直後に「公開に進む」を押すとバリデーションエラーになる）
            await page.waitForTimeout(5000);
            console.log("カバー画像を保存しました");
          }
        } else {
          console.warn("カバー画像の入力欄が見つかりませんでした（スキップ）");
        }
      } catch (e) {
        console.warn("カバー画像のアップロードに失敗しました（続行）:", e.message);
      }
    }

    // 「公開に進む」→ 公開設定ページへ（バリデーションエラー時はリトライ）
    let proceedSuccess = false;
    for (let retry = 0; retry < 3; retry++) {
      await page.waitForSelector("button:has-text('公開に進む')", { timeout: 10000 });
      await page.click("button:has-text('公開に進む')");
      console.log(`「公開に進む」クリック（試行 ${retry + 1}）`);
      await page.waitForTimeout(3500);

      // バリデーションエラーモーダルの検出
      const validationError = page.locator("text=タイトル、本文を入力してください").first();
      if (await validationError.count() > 0) {
        console.warn(`バリデーションエラーを検出（試行 ${retry + 1}）。リトライします...`);
        // Escape でモーダルを閉じる（AIと相談パネルのオーバーレイがボタンクリックをインターセプトするため）
        await page.keyboard.press('Escape');
        await page.waitForTimeout(800);
        // Escape で閉じなかった場合のフォールバック: force クリック
        for (const sel of ['button:has-text("閉じる")', 'button[aria-label="閉じる"]']) {
          const closeBtn = page.locator(sel).first();
          if (await closeBtn.count() > 0) {
            try { await closeBtn.click({ force: true }); } catch (_) {}
            break;
          }
        }
        await page.waitForTimeout(8000); // 追加のオートセーブ待機
        continue;
      }
      proceedSuccess = true;
      break;
    }
    if (!proceedSuccess) {
      await page.screenshot({ path: "/tmp/note-publish-debug.png" });
      throw new Error("「公開に進む」後のバリデーションエラーが解消されませんでした");
    }

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

    // 公開は山下が note.com UI から手動で行う運用のため、
    // 「投稿する」ボタンは押さず、下書き保存された状態でここまでで終了する。
    await page.waitForTimeout(2000); // タグ設定のオートセーブ待機
    const currentUrl = page.url();
    const noteId = currentUrl.match(/\/notes\/(n[a-z0-9]+)\//)?.[1];
    const editUrl = noteId ? `https://note.com/notes/${noteId}/edit` : currentUrl;
    console.log("下書き保存完了。投稿はしません（山下が note.com から手動公開）。");
    console.log(`編集URL: ${editUrl}`);
    setOutput("note_url", editUrl);
    return editUrl;

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
