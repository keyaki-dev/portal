---
blog_tag: ClaudeCode, 生成AI
created: 2026-04-03
flags:
  - 2_published
image: 2026-04-04.png
published_url: https://note.com/keyaki_dev/n/nb5098ea24454
updated_at:
---

# Claude、今何考えてる？｜謎のingメッセージを全部調べてみた

Claude Codeを使っていると、処理中にこんな表示が出ることがあります。

```
Shimmying… (2m 35s)
```

「Shimmy（シミー）」とは、もともとダンスの一種を指す言葉。
Claude、今ダンスしてるの？

気になって調べてみたら、思った以上に面白い仕組みがわかりました。

## ingメッセージは3種類ある

まず整理から。Claude Codeが表示するingメッセージは、大きく3種類に分かれます。

| 種類 | 表示例 | 意味 |
|---|---|---|
| ツール操作 | `Reading main.py` / `Running git status` | 実際の作業内容を反映 |
| フレーバー | `Shimmying…` / `Pondering…` | **ランダムな演出** |
| 完了通知 | `Cooked for 1m 6s` | 処理が終わったことを通知 |

### ツール操作メッセージ

ファイルを読む・書く・コマンドを実行するなど、Claude Codeがツールを使うたびに表示されます。対象のファイル名やコマンドが動的に入るので、「今何をやっているか」が一目でわかります。

| 表示例 | タイミング |
|---|---|
| `Reading main.py` | ファイルを読んでいるとき |
| `Writing index.html` | ファイルを書き込んでいるとき |
| `Editing utils.ts` | ファイルを編集しているとき |
| `Running git status` | コマンドを実行しているとき |
| `Searching for 'useState'` | ファイル内を検索しているとき |

### 完了通知メッセージ

処理が終わると「Cooked for 1m 6s」のような形式で表示されます。過去形の動詞＋経過時間という構成で、どのくらいかかったかが一目でわかります。この表示は `settings.json` の `showTurnDuration: false` で非表示にもできます。

「フレーバー」のメッセージはこれらとまったく別の話です。

## 「Shimmying」に意味はなかった

ソースコードを解析したコミュニティの調査によると、フレーバーメッセージの正体は **187語の動詞リスト** から**ランダムで1語が選ばれて表示されるだけ**とのこと。処理の内容や状態とは完全に無関係です。

つまり「Shimmying中にClaudeは何もshimmyしていない」のです。

187語の中には、なかなかカオスなラインナップが揃っています。いくつか紹介します。

| メッセージ | 直訳 |
|---|---|
| `Clauding` | クロードしてる（Claude専用造語） |
| `Photosynthesizing` | 光合成してる |
| `Moonwalking` | ムーンウォークしてる |
| `Dilly-dallying` | のろのろしてる |
| `Discombobulating` | 混乱させてる |
| `Lollygagging` | ぶらぶらしてる |
| `Spelunking` | 洞窟探検してる |

「のろのろしてる」と表示しながら真面目に考えているClaudeを想像すると、なんだかかわいいです。

ちなみに、この「フレーバーメッセージはランダムで処理状態を反映していない」という点については、GitHubのissueで「文脈に応じて変えてほしい」という改善要望も上がっています。確かにそれはそう。

## カスタマイズもできる

公式ドキュメントに記載のある設定で、`~/.claude/settings.json` にフレーバーメッセージを自分好みに変えられます。

```json
{
  "spinnerVerbs": {
    "mode": "append",
    "verbs": ["Pondering", "Crafting"]
  }
}
```

- `mode: "append"` — デフォルトの187語に追加する
- `mode: "replace"` — デフォルトを全部捨てて自分のリストだけにする

日本語も通るはずなので、「考え中...」「うーん...」にしてしまうことも技術的には可能です。

## まとめ

- Claude Codeのingメッセージは3種類（ツール操作・フレーバー・完了通知）
- `Shimmying` などのフレーバーメッセージは187語からのランダム選出で、処理内容とは無関係
- ツール操作メッセージだけが実際の作業内容を反映している
- `settings.json` の `spinnerVerbs` でカスタマイズ可能（公式ドキュメント記載済み）

---

**参考**
- [Claude Code settings — spinnerVerbs | 公式ドキュメント](https://code.claude.com/docs/en/settings)
- [Spinner verbs should be context-aware, not random · Issue #33057 · anthropics/claude-code · GitHub](https://github.com/anthropics/claude-code/issues/33057)
