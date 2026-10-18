---
name: stygio-companion
description: 製作或修改 Stygiomedusa 的夥伴包 (.companion): 以腳本產生 Lottie 動畫與 state machine, 驗證, 預覽截圖檢查, 打包. 只要使用者在 stygiomedusa-companions repo 中想做一隻新夥伴, 改夥伴的外觀, 動作, 齒輪, 姿勢或尺寸, 修正驗證或預覽的問題, 或提到夥伴, companion, 夥伴包, .companion, 史萊姆旁邊的角色, 就使用這個 skill, 即使使用者沒有明講要打包. Use for creating or editing Stygiomedusa companion packs.
---

# 製作 Stygiomedusa 夥伴

夥伴包讓 Stygiomedusa 的史萊姆旁邊多一隻角色. app 負責夥伴的位置, 點擊, 拖曳時的探出縮回與整體的柔軟身體; 夥伴包提供外觀, 原地的動作, 以及選用的出場與退場 (Lottie 動畫加 dotLottie state machine), 不能執行任何程式碼.

這份文件是流程. 細節在 `references/`, 依步驟需要時讀:

- `references/format.md`: manifest, 畫布座標系, 位置與 `along`, input 契約, 驗證規則, 檔案結構. 產生之前讀.
- `references/animation.md`: 建議的 state 結構, 預設齒輪, keyframe 的寫法. 改外觀或動作之前讀.
- `references/preview.md`: 預覽的截圖與檢查清單. 每次預覽後讀.

所有指令都在 repo 的根目錄執行.

## 檔案放在哪裡

每隻夥伴一個資料夾, 以 manifest 的 `id` 命名 (以下的 `<id>`):

```
<id>/
├── generate.mjs        產生腳本 (以 tools/lottie.mjs 與 tools/gear.mjs 撰寫)
├── companion/          產生的 companion.json, animation.json, state-machine.json (不進版本控制)
└── <id>.companion      打包的夥伴包
```

`companion/` 不進版本控制, repo 只保存 `generate.mjs` 與 `<id>.companion`; 夥伴包含有 `companion/` 的全部內容. 剛 clone 時沒有 `companion/`: 執行 `node <id>/generate.mjs` 重新產生, 或以 `npm run unpack -- <id>/<id>.companion <id>/companion` 從夥伴包還原 (手動編輯過的夥伴只能還原). 修改 `companion/` 後要打包 (步驟 5), 修改才會保存.

只在夥伴的資料夾中建立或修改檔案. `tools/`, `.claude/skills/stygio-companion/`, `.agents/skills/stygio-companion/`, `package.json`, `package-lock.json`, `README.md`, `.gitignore` 屬於工具包: 工具包每次同步都會取代它們, 寫在那裡的修改會消失. 需要改工具包時, 告訴使用者, 不要自己改.

## 1. 檢查環境

先一次檢查全部, 再一次詢問使用者. 不要一項一項問, 也不要在使用者同意前安裝任何東西: 安裝會下載檔案, 寫入使用者的電腦.

| 項目 | 檢查 | 缺少時要執行 |
|---|---|---|
| Node.js 20.6 以上 | `node --version` | 請使用者從 https://nodejs.org 安裝 |
| uv | `uv --version` | 請使用者從 https://docs.astral.sh/uv/ 安裝 |
| Python 3.11 以上 | `uv python find ">=3.11"` | 不需要另外安裝: 第一次執行 `uv run` 時 uv 會自動下載. 列給使用者知道 |
| Node 套件 | 根目錄有沒有 `node_modules/` | `npm install` |
| 預覽用的瀏覽器 | Windows 上有沒有 Edge 或 Chrome | 有 Edge 或 Chrome 時用 `--browser msedge` 或 `--browser chrome`, 不用下載. 都沒有時 `npm run setup:browser` (下載 Chromium, 約 150 MB) |

把缺少的項目與要執行的指令列成一份清單, 詢問一次. 使用者同意後執行, 再執行 `npm run selftest`. 輸出「selftest 通過」才繼續. 全部都有時, 直接執行 selftest, 不需要詢問.

## 2. 新建或修改

**新建**: 先確認夥伴的概念 (外觀, 個性, 吐出什麼東西變成齒輪). 使用者沒有說的部分, 提出具體的建議讓使用者確認. 再決定 `id` (小寫英文, 數字, 連字號), `name`, `author`. 角色要是原創的, 不使用他人的角色或商標.

**修改**: 找到 `<id>/generate.mjs`. 改之前先檢查以下情況, 有任何一項就先告訴使用者:

- `<id>/companion/companion.lottie` 存在: validate 與 pack 會直接使用它, 不讀 `animation.json` 與 `state-machine.json`. 修改產生腳本不會有效果, 除非刪除這個檔案.
- 使用者說過用 Glaxnimate 等工具手動編輯 `<id>/companion/` 中的 JSON: 重新產生會覆寫這些修改. `companion/` 不進版本控制, `git status` 看不出有沒有手動編輯, 不確定時詢問使用者.
- 沒有 `<id>/companion/`: 依「檔案放在哪裡」重新產生或還原. 手動編輯過的夥伴要還原, 不要重新產生.
- 沒有 `generate.mjs`: 夥伴是手動做的. 詢問使用者要改成以腳本產生 (依建議的 state 結構撰寫, 參考現有的外觀), 還是直接修改 JSON.

## 3. 建立產生腳本 (新建時)

1. 先讀 `references/format.md` 與 `references/animation.md`.
2. 建立 `<id>/generate.mjs`. 它寫出三個檔案到 `<id>/companion/`: `companion.json` (manifest), `animation.json` (Lottie), `state-machine.json`.
   - 從 `../tools/lottie.mjs` 匯入基本元件, manifest 有 `gear` 時從 `../tools/gear.mjs` 匯入預設齒輪.
   - 輸出的資料夾用 `join(dirname(fileURLToPath(import.meta.url)), 'companion')`, 只寫到夥伴的資料夾.
3. manifest 的 `id` 與每個 state 的 `animation` 都用 `<id>`. 這兩個必須相同, 否則 state 找不到動畫.
4. 依 `references/animation.md` 的「建議的 state 結構」設計 state. 這樣 hover, 減少動態與換邊的行為不用重新設計.
5. repo 中已有其他夥伴的 `generate.mjs` 時, 可以參考它們的寫法. 不要修改其他夥伴的資料夾.

## 4. 產生, 驗證, 預覽

```
node <id>/generate.mjs
npm run validate -- <id>/companion
npm run preview -- <id>/companion --browser <步驟 1 選的瀏覽器>
```

- validate 不通過時, 依照輸出的原因修改產生腳本, 再重新產生. 原因與 app 匯入時顯示的相同. 規則與理由見 `references/format.md` 的「驗證規則」.
- 驗證通過不代表畫面正確. 每次修改後都要預覽, 並依 `references/preview.md` 的檢查清單檢查 `preview/<id>/sheet.png`. 無法看圖時, 請使用者打開這張圖並逐項回報.
- 重複修改, 產生, 驗證, 預覽, 直到檢查清單全部符合.

## 5. 打包

```
npm run pack -- <id>/companion <id>/<id>.companion
```

一定要指定輸出路徑. 沒有指定時, 夥伴包會寫到根目錄, 而根目錄的 `.companion` 不進版本控制. 內容沒有改變時, 重新打包的夥伴包與原本的完全相同, `git status` 不會顯示變更.

完成後告訴使用者:

1. 在 Stygiomedusa 的 popup 史萊姆分頁按「匯入夥伴包」, 選擇 `<id>/<id>.companion`.
2. 從「夥伴」選單選擇.
3. 預覽沒有模擬角落, 探出縮回, 柔軟身體與換夥伴. 請在 app 中把史萊姆拖到各邊與角落, 並 hover 確認; 有出場與退場時, 把夥伴換成另一隻再換回來確認.
4. 想讓夥伴自動輪流出現時, 在史萊姆分頁的「輪替群組」建立群組並加入這隻夥伴.
