# Stygiomedusa 夥伴包

夥伴包是一個 `.companion` 檔 (zip), 讓 [Stygiomedusa](https://github.com/seanmars/stygiomedusa-release) 的史萊姆旁邊多一隻夥伴. app 負責夥伴的位置, 點擊, 探出縮回與整體的柔軟身體; 夥伴包只提供外觀與原地的動作. 夥伴包不能執行任何程式碼.

這個資料夾是完整的製作工具包 (不需要 Stygiomedusa 的原始碼或 Rust). 取得方式: clone [stygiomedusa-companions](https://github.com/seanmars/stygiomedusa-companions), 工具包就是 repo 的根目錄. 製作夥伴請使用 repo 附的 skill `stygio-companion` (見「用 skill 製作」).

## 使用夥伴包

1. 下載 `.companion` 檔. 做好的夥伴包在各夥伴的資料夾中, 例如 `companionk/companionk.companion`.
2. 在 Stygiomedusa 的 popup 史萊姆分頁按「匯入夥伴包」.
3. 從「夥伴」選單選擇.

## 需要的工具

| 工具 | 版本 | 用途 | 安裝 |
|---|---|---|---|
| Node.js (含 npm) | 20.6 以上 | 產生 Lottie JSON, 預覽 | https://nodejs.org |
| uv | 0.4 以上 | 執行 `companion.py` (驗證與打包); 第一次執行時自動下載 Python 3.11 以上 | https://docs.astral.sh/uv/ |
| 瀏覽器 | Chromium, Edge 或 Chrome | 預覽 | `npm run setup:browser` 下載 Chromium (約 150 MB), 或用已安裝的 Edge 與 Chrome |
| Glaxnimate (選用) | | 以 GUI 編輯 `animation.json` | https://glaxnimate.org |

`companion.py` 只用 Python 標準函式庫, 依賴宣告在檔案開頭 (PEP 723 inline metadata), 所以不需要 `pyproject.toml`, venv 或 `pip install`. Node 的套件只有 `@lottiefiles/dotlottie-web` (固定為 app 使用的版本) 與 `playwright`.

## 安裝

1. 在這個資料夾執行 `npm install`.
2. 預覽要用 Chromium 時執行 `npm run setup:browser`. 用 Edge 或 Chrome 時跳過這步, 預覽時加上 `--browser msedge` 或 `--browser chrome`.
3. 確認工具可以用: `npm run selftest`. 輸出「selftest 通過」即完成.

使用 skill 時, AI 會先檢查這些項目, 並在安裝前詢問.

## 用 skill 製作

`stygio-companion` skill 涵蓋新建與修改夥伴的完整流程: 準備環境, 從範本產生, 驗證, 預覽並檢查截圖, 打包. 在這個 repo 中開啟 Claude Code (skill 在 `.claude/skills/`) 或其他支援 `.agents/skills/` 的 AI 工具, 直接描述想要的夥伴即可. 也可以用 `/stygio-companion` 明確觸發.

範例:

```
做一隻新的夥伴: 一隻藍色的小水母, 觸手會慢慢飄. hover 時吐出泡泡, 泡泡變成齒輪.
```

```
把 companionk 的星星改成愛心, 其他不變.
```

AI 會在夥伴自己的資料夾 (例如 `jellyfish/`) 中建立產生腳本與產物, 最後產生 `jellyfish/jellyfish.companion`.

不用 AI 時, 直接讀 skill 的文件: `SKILL.md` 是流程, `references/` 是格式, 動畫的畫法與預覽的檢查清單.

## 版本

- `package.json` 的 `version` 是工具包對應的 Stygiomedusa 版本. 驗證規則與這個版本的 app 匯入時相同. `npm run selftest` 的輸出也會顯示這個版本.
- 請用相同或較新版本的 Stygiomedusa 匯入夥伴包.
- stygiomedusa-companions 的每次更新都是一個 `companion-tool: 同步 Stygiomedusa <版本>` 的 commit. 需要舊版的工具包時, checkout 對應的 commit.

## 資料夾內容

| 路徑 | 內容 |
|---|---|
| `mochi/` | 原創的範本夥伴「麻糬」: `companion.json` (manifest), `animation.json` (Lottie JSON), `state-machine.json` (dotLottie state machine) |
| `tools/template.mjs` | 產生 `mochi/` 的腳本; 新夥伴從複製這支腳本開始 |
| `tools/lottie.mjs` | Lottie JSON 的基本元件 (圓, 填色, 線條, 群組) |
| `tools/gear.mjs` | 預設齒輪: 與史萊姆原本的齒輪相同的外觀 |
| `tools/companion.py` | 驗證, 打包, 組出預覽用的檔案; 規則與 app 匯入時相同 |
| `tools/cases.json` | 驗證規則的案例 (`selftest` 使用) |
| `tools/preview.mjs`, `tools/preview.html` | 預覽: 以 app 相同的 runtime 播放並截圖 |
| `skills/stygio-companion/` | 製作夥伴的 skill. 在 stygiomedusa-companions 中位於 `.claude/skills/` 與 `.agents/skills/` (兩份相同) |
| `package.json`, `package-lock.json` | Node 的套件與指令 |
| 其他資料夾 | 做好的夥伴, 例如 `companionk/`: 產生腳本, 產生的檔案與 `.companion`. 不屬於工具包, 同步時不變 |

產物 (`build/`, `preview/`, 這個資料夾中的 `*.companion`) 不進版本控制.

skill 與 `tools/`, `mochi/` 一樣屬於工具包: 不要在 stygiomedusa-companions 修改, 下次同步會覆寫. 只改了其中一份時, `npm run selftest` 也會失敗.

## 指令

在這個資料夾執行. `npm run <指令> -- <參數>` 與直接執行右欄相同.

| npm 指令 | 直接執行 | 說明 |
|---|---|---|
| `npm run template -- [資料夾]` | `node tools/template.mjs [資料夾]` | 產生範本到 `mochi/` (或指定的資料夾); 會覆寫三個檔案 |
| `npm run validate -- <資料夾或 .companion>` | `uv run tools/companion.py validate <...>` | 驗證; 原因與 app 匯入時顯示的相同 |
| `npm run pack -- <資料夾> [輸出]` | `uv run tools/companion.py pack <資料夾> [輸出]` | 驗證通過後產生 `.companion`; 沒有指定輸出時寫到目前目錄的 `<id>.companion` |
| `npm run preview -- <資料夾或 .companion> [選項]` | `node tools/preview.mjs <...> [選項]` | 預覽, 截圖到 `preview/<id>/` |
| `npm run selftest` | `uv run tools/companion.py selftest` | 檢查驗證規則, 範本與 skill 的契約 |
| | `uv run tools/companion.py build <資料夾或 .companion> <輸出資料夾>` | 寫出 app 安裝後的 `companion.json` 與 `companion.lottie` (預覽使用) |

預覽的選項:

- `--browser chromium|msedge|chrome`: 預設 `chromium`.
- `--scale 2`: 截圖的解析度倍數.
- `--edges right,bottom,left,top`: 只預覽部分的邊; 上下緣各預覽兩個 `along`.

## 維護

工具包在 Stygiomedusa 的 repo (不公開) 中開發. 發版後以 `pnpm companion:publish` 把 app 版本的 tag 中的工具包同步到 stygiomedusa-companions 的根目錄. 同步只取代工具包的頂層項目 (`tools/`, `mochi/`, `package.json`, `README.md` 等) 與 skill 的資料夾 (`skills/<名稱>/` 複製到 `.claude/skills/<名稱>/` 與 `.agents/skills/<名稱>/`). 夥伴的資料夾與其他 skill 不變. 不要在 stygiomedusa-companions 直接修改工具包的檔案: 下次同步會覆寫.

以下在 Stygiomedusa 的 repo 中進行:

- `version` 由 `pnpm set-version` 與 app 一起更新. `pnpm companion:publish` 在兩者不同時拒絕發布.
- `companion.py` 移植了 Stygiomedusa 的驗證規則 (`src-tauri/src/companion/`). 一致性由兩組檢查保證:
  - `tools/cases.json`: Stygiomedusa 的 Rust 測試 `tests/companion_tool_cases.rs` 以它檢查 app, `npm run selftest` 以同一份檔案檢查 `companion.py`. app 的規則或原因的文字改變時, 同步更新 `companion.py` 與 `cases.json`.
  - skill 的契約區塊 (`skills/stygio-companion/references/format.md`): 列出常數與 input 契約. 同一個 Rust 測試檔以它比對 app, selftest 以它比對 `companion.py`. app 的常數或 input 改變時, 同步更新這個區塊.
  - 兩邊都通過才表示規則一致. 契約區塊以外的說明 (例如驗證規則的公式) 不在檢查中, 規則改變時一起更新 skill 的 references.
- 在 Stygiomedusa 的 repo 中, `pnpm companion validate|pack <資料夾>` 是 Rust 版本的同一組指令, `pnpm companion:template` 執行 `tools/template.mjs`.
- dotLottie runtime 的版本固定為 app 使用的版本; app 升級 `@lottiefiles/dotlottie-web` 時一起更新 `package.json`.
