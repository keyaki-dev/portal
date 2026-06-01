---
created: 2026-05-21
flags:
  - 2_published
blog_tag:
  - ニュース
  - テクノロジー
  - 生成AI
image: 2026-05-21.png
published_url: 'https://note.com/keyaki_dev/n/n88d300533f8f'
portfolio_url: 'https://keyaki-dev.com/blog/2026-05-21'
---

# 【速報】Gemini CLI が終了——Antigravity CLI への移行手順まとめ

2026年5月19日、Googleから重要なアナウンスが届きました。**Gemini CLI が Antigravity CLI に統合され、2026年6月18日以降はサービスを停止する**というものです。

この記事では、発表の概要と実際の移行手順をまとめます。

---

## 何が起きているのか

Google は「Antigravity」という新しいマルチエージェントプラットフォームへのツール統合を進めています。Gemini CLI はその一環として Antigravity CLI に置き換えられます。

Antigravity CLI の主な特徴は以下のとおりです。

- **Go 言語で再構築**され、応答速度が向上
- **非同期ワークフロー**対応。複数エージェントがバックグラウンドで並行動作するため、ターミナルをブロックしない
- Antigravity 2.0 デスクトップアプリと同じエンジンを共有

---

## 移行スケジュール

| 日付 | 内容 |
|------|------|
| 2026年5月19日 | Antigravity CLI が全ユーザーに提供開始 |
| **2026年6月18日** | Gemini CLI のサービス終了 |

**約1ヶ月しかありません。** 早めの対応をおすすめします。

---

## 対象ユーザー

**移行が必要な方:**
- 個人ユーザー・無料プランユーザー
- Gemini Code Assist for Individuals 利用者
- GitHub 無料プラン利用者

**移行不要な方（継続サポートあり）:**
- Gemini Code Assist Standard / Enterprise の企業ユーザー
- Google Cloud 経由のユーザー

---

## 移行手順

### Step 1: Antigravity CLI のインストール確認

すでにインストール済みの場合は `agy --version` で確認できます。

```bash
agy --version
# 1.0.0 など表示されれば OK
```

未インストールの場合は公式サイトの案内に従ってインストールしてください。

---

### Step 2: 拡張機能のインポート

以下のコマンドで Gemini CLI の拡張機能を自動インポートできます。

```bash
agy plugin import gemini
```

Gemini CLI に拡張機能を入れていなかった場合は `No gemini extensions found.` と表示されます。これは正常な動作です。

ただし以下は自動移行されないため、手動対応が必要です。

- ワークスペーススキル（後述の Step 4 参照）
- `settings.json` に直接記述したインライン MCP 設定（Step 3 で手動移行）

---

### Step 3: MCP サーバーの設定移行

**これが最も注意が必要な手順です。**

Gemini CLI では MCP の設定を `~/.gemini/settings.json` の `mcpServers` キーに書いていました。Antigravity CLI では専用ファイルに移す必要があります。

**移行先ファイル:**
```
~/.gemini/antigravity-cli/mcp_config.json
```

**重要な変更点が2つあります。**

1. **HTTP タイプのサーバーは `url` フィールドを `serverUrl` に変更**する必要があります。変更しないとサイレント失敗します。
2. **`mcpServers` キーのラッパーはそのまま維持**します（ネストを外さないでください）。

```json
// Gemini CLI（移行前）
{
  "mcpServers": {
    "my-server": {
      "url": "https://example.com/mcp",
      "type": "http"
    }
  }
}

// Antigravity CLI（移行後）
{
  "mcpServers": {
    "my-server": {
      "serverUrl": "https://example.com/mcp",
      "type": "http"
    }
  }
}
```

stdio タイプのサーバーはフィールド名の変更は不要です。`mcpServers` ラッパーはそのままに、各サーバーの設定だけコピーすればOKです。

---

### Step 4: スキルの移行

Antigravity CLI がスキルを読み込むパスは以下のとおりです。

```
~/.agents/skills/{skill_name}/SKILL.md
```

Gemini CLI でスキルを `~/.agents/skills/` に配置していた場合、パス自体は変わりません。ただし**シンボリックリンクは認識されません。**ディレクトリがシンボリックリンクになっている場合は実体コピーに置き換える必要があります。

```bash
# symlink になっているか確認
ls -la ~/.agents/skills/

# lrwxr-xr-x（symlink）のものは cp -r で実体コピーに置き換える
rm ~/.agents/skills/skill-name
cp -r ~/path/to/skill-name ~/.agents/skills/skill-name
```

`agy` の中で `/skills` と入力すると、現在認識されているスキルの一覧を確認できます。

#### ワークスペーススキル

プロジェクト内のスキルは `.agents/skills/` に配置します。Gemini CLI 時代に `.gemini/skills/` を使っていた場合は移動が必要です。

```bash
mv .gemini/skills/ .agents/skills/
```

---

### Step 5: サブエージェントの移行

**サブエージェント機能は Antigravity CLI でも引き継がれます。** 設定ファイルの移行は `agy plugin import gemini` で自動対応されます。

ただし動作が変わる点があります。Gemini CLI ではターミナルをブロックする形で動作していましたが、Antigravity CLI では**完全に非同期・バックグラウンドで実行される**ようになりました。大規模なリファクタリングや並列調査タスクでも、ターミナルをロックしないのが大きな改善点です。

ワークスペース単位のサブエージェント設定は `.agents/` ディレクトリ配下で管理します。

---

### Step 6: 指示ファイルの確認

`AGENTS.md` と `GEMINI.md` はそのまま互換性があります。グローバルの `~/.gemini/GEMINI.md` もワークスペース内のファイルも変更不要です。

---

## まとめ

移行のポイントを整理すると以下のとおりです。

| 要素 | 対応 |
|------|------|
| 拡張機能 | `agy plugin import gemini` で自動 |
| MCP 設定 | `~/.gemini/antigravity-cli/mcp_config.json` に手動移行 + `url` → `serverUrl` に変更（HTTP 型のみ）、`mcpServers` ラッパーは維持 |
| スキル（グローバル） | `~/.agents/skills/` に実体コピーが必要（symlink 不可） |
| スキル（ワークスペース） | `.gemini/skills/` → `.agents/skills/` に手動移動 |
| サブエージェント | 自動移行。動作が非同期に変わる |
| 指示ファイル（AGENTS.md 等） | 変更不要 |

機能の完全な互換性は移行当初は保証されていないとのことなので、移行後は動作確認をしながら使っていくのが良さそうです。使用感のレポートはまた別の記事でまとめます。

なお、Gemini CLI は Apache 2.0 ライセンスのオープンソースプロジェクトでしたが、Antigravity CLI は現時点でオープンソース化されていません。開発者コミュニティからは懸念の声も出ているため、今後の動向に注目です。
