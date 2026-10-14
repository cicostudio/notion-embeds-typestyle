# notion-embeds-typestyle

給 Notion 用的置中文字嵌入工具。Notion 原生不能置中文字，這個頁面用嵌入（`/embed`）的方式補上。

## 用法（建議：文字庫代碼）

所有文字存在 `public/presets.json`，每段一個代碼。嵌入網址只寫代碼，不含中文：

```
https://notion-embeds-typestyle.nameless-wood-bba1.workers.dev/?id=title-01
```

- **新增**：打開工具首頁（產生器）→ 設定代碼與樣式 → 複製「存檔用 JSON」→ 貼進 `presets.json` → commit。
- **修改**：直接改 `presets.json` 裡的文字並 commit，Notion 上已嵌入的會自動更新，不用重貼。
- **總覽**：`/?list` 列出文字庫所有項目，可預覽、複製網址、點「編輯」載入產生器。

代碼規則：英文小寫、數字、連字號（例如 `hero-sub`、`title-01`）。

字級會依嵌入框寬高自動縮放到剛好放得下；在 Notion 裡拉高度就是在控制字級。

`presets.json` 格式：

```json
"title-01": {
  "t": ["別再頭痛醫頭", "消耗時間、金錢了！"],
  "c": "2f6b55",
  "s": 56,
  "w": 700
}
```

`t` 是陣列，一個元素一行；`""` 代表空一行；`*字*` 套強調色。其餘欄位同下方參數表。

## 參數（presets.json 欄位，也可直接當網址參數用）

| 參數 | 說明 | 預設 |
|---|---|---|
| `t` | 文字，`|` 換行；`*字*` 套強調色 | （必填） |
| `c` | 文字顏色（hex，不含 #） | `2f6b55` |
| `hc` | 強調色 | `4a9a6e` |
| `s` | 最大字級 px | `48` |
| `w` | 字重 | `700` |
| `lh` | 行高 | `1.5` |
| `ls` | 字距 em | `0` |
| `a` | 對齊 `center` / `left` / `right` | `center` |
| `bg` | 背景色 hex，省略為透明 | 透明 |
| `p` | 內距 px | `8` |

範例：`?t=別再頭痛醫頭|消耗時間、金錢了！&c=2f6b55&s=56&w=700`

## 部署（Cloudflare Workers）

Workers & Pages → 建立 → 匯入 Git 存放庫，選擇此 repo，欄位如下：

| 欄位 | 填寫 |
|---|---|
| 專案名稱 | `notion-embeds-typestyle`（需與 `wrangler.jsonc` 的 `name` 相同） |
| 組建命令 | 留空 |
| 部署命令 | `npx wrangler deploy`（預設值） |
| 預覽指令 | 留空 |
| 路徑 | `/` |
| 變數名稱／變數值 | 留空 |

網頁檔放在 `public/`，`wrangler.jsonc` 指定它為靜態資產目錄；之後推送到 `main` 會自動重新部署。
