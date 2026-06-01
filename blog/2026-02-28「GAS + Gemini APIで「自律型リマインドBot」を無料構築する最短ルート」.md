---
flags:
  - 2_published
blog_tag:
  - エンジニア
  - 生成AI
  - GAS
  - チャットボット
  - Gemini
created: 2026-02-28
published_url: https://note.com/keyaki_dev/n/nead30a02ada3
portfolio_url: 'https://keyaki-dev.com/blog/2026-02-28'
image: 2026-02-28.jpg
---
# GAS + Gemini APIで「自律型リマインドBot」を無料構築する最短ルート

「会議の議事録、明日までにやっておいてね」

そう頼んだのに、翌日になっても音沙汰がない……。そんな社内の「うっかり」を撲滅するために、**「やるまで追いかけ続ける」** 執筆代行ならぬ「リマインド代行」Botを作りました。

本記事では、**Google Apps Script (GAS)** と **Gemini API** を組み合わせ、無料で賢い「エージェント的Bot」を開発する手法を解説します。

---

## 1. 今回作りたかったもの：エージェント型リマインドBot

単に指定時間にメッセージを送るだけのBotなら、これまでの技術でも簡単でした。今回目指したのは、**「エージェント的」な振る舞い**です。

- **自然言語で依頼**: 「来週の月曜10時にリマインドして。終わるまで1時間おきに。」といった曖昧な指示を理解する。
    
- **自律的な実行**: 指定時間に通知を送るだけでなく、ユーザーから「完了」の報告があるまで、自分で次のリマインドを予約し続ける。
    
- **状態の管理**: 「今どのタスクが動いているか」を把握し、ユーザーの完了報告を正しく認識して停止する。
    

---

## 2. 最強の「無料」開発環境：GAS × Gemini API

社内ツール開発において、最大のハードルは「予算」と「サーバー維持」です。

- **Gemini API (Google AI Studio)**: 2026年現在も、Flashモデル（Gemini 2.0 / 3.0 Flashなど）には強力な**無料枠**が用意されており、社内小規模利用ならほぼコストゼロで運用可能です。
    
- **Google Apps Script (GAS)**: サーバー不要、メンテナンス不要。さらに「時間指定トリガー」という、リマインド機能に不可欠な武器が標準装備されています。
    

---

## 3. 核心技術：Function Calling とは？

このBotの「脳」となるのが **Function Calling** です。

これは、LLMが「ユーザーの言葉」を解析し、あらかじめ定義しておいた**「プログラム（関数）」を呼び出すための引数**を作ってくれる機能です。

### 三層構造で理解する開発スタック

|**レイヤー**|**役割**|**選択した技術**|
|---|---|---|
|**環境層**|実行・リソース管理|**GAS** (トリガー, スプレッドシート)|
|**フレームワーク層**|開発効率化|(今回はなし / 後述の **LangChain**)|
|**インテリジェンス層**|思考・判断|**Gemini API**|

---

## 4. 【実践】GASでの実装サンプル

まずは、ライブラリを使わずに「素」の状態で Gemini API を叩くコードを見てみましょう。Function Calling の仕組みが直感的に分かります。

### ① ツールの定義（LLMへの指示書）

JavaScript

```
const tools = [{
  function_declarations: [{
    name: "set_reminder",
    description: "リマインドを登録します。完了報告があるまで繰り返す設定が可能です。",
    parameters: {
      type: "OBJECT",
      properties: {
        time: { type: "STRING", description: "ISO8601形式の日時" },
        message: { type: "STRING", description: "通知内容" },
        repeat: { type: "BOOLEAN", description: "完了まで繰り返すか" }
      },
      required: ["time", "message"]
    }
  }]
}];
```

### ② API呼び出しと関数実行

JavaScript

```
function askGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: tools
  };

  const response = UrlFetchApp.fetch(url, {
    method: "post", contentType: "application/json",
    payload: JSON.stringify(payload)
  });

  const res = JSON.parse(response.getContentText());
  const call = res.candidates[0].content.parts[0].functionCall;

  if (call && call.name === "set_reminder") {
    // ここで実際にスプレッドシートに書き込み、GASトリガーを設定する
    return `了解しました！${call.args.time}にリマインドをセットします。`;
  }
  
  return res.candidates[0].content.parts[0].text;
}
```

---

## 5. もっと楽に書きたいなら：LangChainという選択肢

上記のコードはシンプルですが、会話の履歴を保持したり、複数の関数を複雑に組み合わせる（チェーンする）場合は、**LangChain** というライブラリを使うと劇的に記述量が減ります。

### LangChain (Python) でのサンプル

Python環境などが使える場合、以下のように直感的に「ツール」をLLMに連結できます。

Python

```
from langchain_google_genai import ChatGemini
from langchain.tools import tool

@tool
def set_reminder(time: str, message: str):
    """リマインドを登録するツール"""
    # 登録ロジック
    return "Success"

model = ChatGemini(model="gemini-2.0-flash")
# ツールをバインドするだけで、モデルが勝手に判断して呼び出すようになる
model_with_tools = model.bind_tools([set_reminder])

response = model_with_tools.invoke("明日9時に進捗確認のリマインドして")
```

GASではライブラリの制約上、直接 LangChain をフル活用するのは難しいですが、**「Function Callingという概念」さえ理解していれば、フレームワークがあろうとなかろうと、LLMを自由自在に操れる**ようになります。

---

## 6. まとめ：社内エンジニアこそLLMエージェントを！

今回、GASとGemini APIを直接繋ぐことで、以下のメリットを享受できました。

1. **圧倒的低コスト**: API無料枠とGASの無料枠で完結。
    
2. **ブラックボックスの解消**: 自分でJSONをパースすることで、Function Callingの仕組みが深く理解できた。
    
3. **実用性**: 「粘り強くリマインドする」という、人間がやると角が立つ仕事をBotに任せられた。
    

「LLMはただのチャット」と思っている層に、**「ツールを使わせることで仕事を完結させる」** エージェントの力をぜひ見せつけてあげましょう！
