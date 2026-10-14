# notion-embeds-typestyle

給 Notion 用的置中文字嵌入工具。Notion 原生不能置中文字，這個頁面用嵌入（`/embed`）的方式補上。

## 用法

打開工具首頁就是編輯器（所見即所得）：直接在框裡打字、選取文字按「強調」、調整樣式，按「💾 存檔」（或 Ctrl/⌘ + S）。
存檔需要編輯密碼，第一次輸入後同一台瀏覽器會記住。有未存檔的修改時，離開頁面或切換到其他代碼會跳出警告。

嵌入網址只寫代碼，不含中文：

```
https://notion-embeds-typestyle.nameless-wood-bba1.workers.dev/?id=title-01
```

修改同一個代碼並存檔，Notion 上的嵌入約 1 分鐘內自動更新，不用重貼。

- `/?list`：文字庫總覽（預覽、搜尋、複製網址、編輯）
- `/api/presets`：整個文字庫的 JSON，可當備份

### 資料存放

- 文字庫存在 Cloudflare KV（綁定名稱 `PRESETS`，部署時自動建立），鍵為 `presets`。
- `public/presets.json` 只是**初始內容**：KV 還沒有任何存檔時才會讀它。第一次在編輯器存檔後，以 KV 為準，改這個檔案不再有作用。
- 編輯密碼是 Worker 的密碼變數 `EDIT_PASSWORD`，在 Cloudflare 後台「設定 → 變數和密碼」設定；沒設定時無法存檔，但嵌入仍可正常顯示。

`t` 是陣列，一個元素一行；`""` 代表空一行；`*字*` 為強調色。

## 參數（文字庫欄位，也可直接當網址參數用）

| 參數 | 說明 | 預設 |
|---|---|---|
| `t` | 文字（陣列一行一個；網址參數用 `\|` 換行）；`*字*` 套強調色 | （必填） |
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
