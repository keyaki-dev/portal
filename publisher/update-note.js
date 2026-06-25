// note.com 既存記事を更新するスクリプト
// 環境変数: NOTE_SESSION, COVER_IMAGE, AUTO_HEADER
// 引数: <note-id> <filepath>
//   note-id: 記事ID（例: n270e74e458f9）
//   filepath: 記事ファイルの絶対パス（または publisher/ からの相対パス）

const { chromium } = require("playwright");
const matter = require("gray-matter");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

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

async function updateNote(noteId, filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`ファイルが見つかりません: ${filePath}`);
  }
  if (!NOTE_SESSION) throw new Error("NOTE_SESSION が未設定です");

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const h1Title = extractTitle(content);
  const title = h1Title || data.title || "";
  const body = h1Title ? removeH1(content) : content;

  if (!title) throw new Error("タイトルが見つかりません（H1 または front matter の title が必要）");

  // AUTO_HEADER=1 かつ COVER_IMAGE 未指定の場合はヘッダー画像を自動生成
  if (AUTO_HEADER && !COVER_IMAGE) {
    try {
      const headerPath = `/tmp/note-header-update.png`;
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

  console.log(`編集開始: ${title} (${noteId})`);

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

  try {
    const editUrl = `https://note.com/notes/${noteId}/edit`;
    console.log(`編集ページへ移動: ${editUrl}`);
    await page.goto(editUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // ログインチェック
    if (page.url().includes("/login") || page.url().includes("/signin")) {
      throw new Error("セッションが無効です。NOTE_SESSION を更新してください。");
    }
    console.log(`現在のURL: ${page.url()}`);

    // タイトルを更新
    const titleInput = page.locator('textarea[placeholder="記事タイトル"]').first();
    await titleInput.waitFor({ timeout: 10000 });
    await titleInput.fill("");
    await titleInput.fill(title);
    console.log("タイトル更新完了");
    await page.waitForTimeout(500);

    // 本文をクリアして更新（ProseMirrorエディタ）
    const proseMirror = page.locator("div.ProseMirror").first();
    await proseMirror.waitFor({ timeout: 10000 });
    await proseMirror.click();
    await page.waitForTimeout(300);

    // 全選択して削除
    await page.keyboard.press("Control+a");
    await page.waitForTimeout(300);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(500);

    // 新しい本文を入力（クリップボード経由で高速入力）
    await page.evaluate((text) => {
      const el = document.querySelector("div.ProseMirror");
      if (el) {
        el.focus();
        document.execCommand("insertText", false, text);
      }
    }, body);
    console.log("本文更新完了");
    await page.waitForTimeout(1000);

    // カバー画像のアップロード（2段階フロー）
    if (COVER_IMAGE && fs.existsSync(COVER_IMAGE)) {
      try {
        // 編集ページが完全に描画されるまで待機
        await page.waitForTimeout(2000);

        // 既存のカバー画像があれば変更、なければ新規追加
        // Step1: カバー画像変更ボタン or 追加ボタンをクリック
        const changeBtn = page.locator('[aria-label="画像を変更"], [aria-label="カバー画像を変更"]').first();
        const addBtn = page.locator('[aria-label="画像を追加"]').first();

        // ボタンが表示されるまで最大5秒待機
        await addBtn.waitFor({ timeout: 5000, state: "visible" }).catch(() => {});
        await changeBtn.waitFor({ timeout: 1000, state: "visible" }).catch(() => {});

        if (await changeBtn.count() > 0) {
          await changeBtn.click();
          await page.waitForTimeout(800);
          console.log("カバー画像変更ボタンをクリック");
        } else if (await addBtn.count() > 0) {
          await addBtn.click();
          await page.waitForTimeout(800);
          console.log("カバー画像追加ボタンをクリック");

          // 展開メニューの「画像をアップロード」をクリック
          const uploadMenuItem = page.locator('button:has-text("画像をアップロード")').first();
          if (await uploadMenuItem.count() > 0) {
            await uploadMenuItem.click();
            await page.waitForTimeout(1000);
            console.log("「画像をアップロード」クリック");
          }
        } else {
          console.warn("カバー画像ボタンが見つかりませんでした（追加・変更とも不在）");
        }

        // file input を待機
        const fileInput = await page.waitForSelector(
          '#note-editor-eyecatch-input, input[type="file"][accept*="image"]',
          { timeout: 5000, state: "attached" }
        ).catch(() => null);

        if (fileInput) {
          await fileInput.setInputFiles(COVER_IMAGE);
          console.log("カバー画像をアップロードしました");
          await page.waitForTimeout(3000);

          // クロップダイアログの「保存」ボタンをクリック
          // モーダル内のボタンを探す（モーダルオーバーレイの内側）
          const cropSaveBtn = page.locator(
            '.ReactModal__Content button:has-text("保存"), ' +
            '[role="dialog"] button:has-text("保存"), ' +
            '.ReactModalPortal button:has-text("保存")'
          ).first();

          const cropSaveBtnCount = await cropSaveBtn.count();
          if (cropSaveBtnCount > 0) {
            await cropSaveBtn.click({ force: true });
            await page.waitForTimeout(2000);
            console.log("カバー画像を保存しました（モーダル内ボタン）");
          } else {
            // フォールバック: モーダル内の最初のボタンを探す
            const modalBtn = page.locator('.ReactModal__Content button, .ReactModalPortal button').first();
            if (await modalBtn.count() > 0) {
              await modalBtn.click({ force: true });
              await page.waitForTimeout(2000);
              console.log("カバー画像を保存しました（フォールバック）");
            } else {
              console.warn("クロップ保存ボタンが見つかりませんでした（スキップ）");
            }
          }
        } else {
          console.warn("カバー画像の入力欄が見つかりませんでした（スキップ）");
        }
      } catch (e) {
        console.warn("カバー画像のアップロードに失敗しました（続行）:", e.message);
      }
    }

    // 記事を更新保存
    // 編集中の既存記事は「更新する」「保存する」ボタンがあるか、
    // 「公開に進む」→「更新する」フローの場合もある
    let saved = false;

    // パターン1: 直接「更新する」「保存する」ボタン
    const directUpdateBtn = page.locator('button:has-text("更新する"), button:has-text("保存する")').first();
    if (await directUpdateBtn.count() > 0) {
      await directUpdateBtn.click();
      console.log("「更新する」をクリック（直接）");
      await page.waitForTimeout(3000);
      saved = true;
    }

    // パターン2: 「公開に進む」→ 設定ページ → 「更新する」「投稿する」
    if (!saved) {
      const proceedBtn = page.locator("button:has-text('公開に進む')").first();
      if (await proceedBtn.count() > 0) {
        await proceedBtn.click();
        console.log("「公開に進む」クリック");
        await page.waitForTimeout(2000);

        // 設定ページで更新ボタンを探す（複数バリアント対応）
        const updateLabels = ["更新する", "投稿する", "更新して公開", "公開設定を保存", "記事を更新", "保存して公開"];
        let foundLabel = null;
        for (const label of updateLabels) {
          const btn = page.locator(`button:has-text("${label}")`).first();
          if (await btn.count() > 0) {
            foundLabel = label;
            await btn.click();
            console.log(`「${label}」クリック`);
            await page.waitForTimeout(3000);
            saved = true;
            break;
          }
        }
        if (!foundLabel) {
          // デバッグ: 現在ページのボタン一覧を出力
          const btns = await page.locator("button").all();
          const btnTexts = await Promise.all(btns.map(b => b.textContent()));
          console.log("利用可能なボタン:", btnTexts.filter(t => t && t.trim()).join(" / "));
          await page.screenshot({ path: "/tmp/note-update-debug.png" });
          console.log("デバッグスクリーンショット: /tmp/note-update-debug.png");
        }
      }
    }

    if (!saved) {
      throw new Error("保存ボタンが見つかりませんでした");
    }

    // 成功確認
    const finalUrl = page.url();
    console.log(`更新完了: ${finalUrl}`);
    const publishedUrl = `https://note.com/keyaki_dev/n/${noteId}`;
    console.log(`公開URL: ${publishedUrl}`);
    return publishedUrl;

  } finally {
    await browser.close();
  }
}

const noteId = process.argv[2];
const inputPath = process.argv[3];

if (!noteId || !inputPath) {
  console.error("使い方: node update-note.js <note-id> <filepath>");
  console.error("例: node update-note.js n270e74e458f9 /path/to/article.md");
  process.exit(1);
}

const resolvedPath = path.isAbsolute(inputPath)
  ? inputPath
  : path.join(__dirname, inputPath);

updateNote(noteId, resolvedPath)
  .then((url) => {
    console.log("完了:", url);
    process.exit(0);
  })
  .catch((err) => {
    console.error("エラー:", err.message);
    process.exit(1);
  });
