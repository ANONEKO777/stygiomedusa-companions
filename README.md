# Stygiomedusa 夥伴包

夥伴包是一個 `.companion` 檔 (zip), 讓 [Stygiomedusa](https://github.com/seanmars/stygiomedusa-release) 的史萊姆旁邊多一隻夥伴. app 負責夥伴的位置, 點擊, 探出縮回與整體的柔軟身體; 夥伴包只提供外觀與原地的動作. 夥伴包不能執行任何程式碼.

這個資料夾是完整的製作工具包 (不需要 Stygiomedusa 的原始碼或 Rust). 也可以把整個資料夾交給 AI, 請它依照這份文件製作新的夥伴. 取得方式: clone [stygiomedusa-companions](https://github.com/seanmars/stygiomedusa-companions), 工具包就是 repo 的根目錄.

## 使用夥伴包

1. 下載 `.companion` 檔. 做好的夥伴包在各夥伴的資料夾中, 例如 `companionk/companionk.companion`.
2. 在 Stygiomedusa 的 popup 史萊姆分頁按「匯入夥伴包」.
3. 從「夥伴」選單選擇.

## 需要的工具

| 工具 | 版本 | 用途 | 安裝 |
|---|---|---|---|
| Node.js (含 npm) | 20.6 以上 | 產生 Lottie JSON (`template.mjs`), 預覽 (`preview.mjs`) | https://nodejs.org |
| uv | 0.4 以上 | 執行 `companion.py` (驗證與打包); 第一次執行時自動下載 Python 3.11 以上 | https://docs.astral.sh/uv/ |
| 瀏覽器 | Chromium, Edge 或 Chrome | 預覽 | `npm run setup:browser` 下載 Chromium (約 150 MB), 或用已安裝的 Edge 與 Chrome |
| Glaxnimate (選用) | | 以 GUI 編輯 `animation.json` | https://glaxnimate.org |

`companion.py` 只用 Python 標準函式庫, 依賴宣告在檔案開頭 (PEP 723 inline metadata), 所以不需要 `pyproject.toml`, venv 或 `pip install`. Node 的套件只有 `@lottiefiles/dotlottie-web` (固定為 app 使用的 0.81.0) 與 `playwright`.

## 安裝

1. 在這個資料夾執行 `npm install`.
2. 預覽要用 Chromium 時執行 `npm run setup:browser`. 用 Edge 或 Chrome 時跳過這步, 預覽時加上 `--browser msedge` 或 `--browser chrome`.
3. 確認工具可以用: `npm run selftest`. 輸出「selftest 通過」即完成.

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
| `package.json`, `package-lock.json` | Node 的套件與指令 |
| 其他資料夾 | 做好的夥伴, 例如 `companionk/`: 產生腳本, 產生的檔案與 `.companion`. 不屬於工具包, 同步時不變 |

產物 (`build/`, `preview/`, 這個資料夾中的 `*.companion`) 不進版本控制.

## 指令

在這個資料夾執行. `npm run <指令> -- <參數>` 與直接執行右欄相同.

| npm 指令 | 直接執行 | 說明 |
|---|---|---|
| `npm run template -- [資料夾]` | `node tools/template.mjs [資料夾]` | 產生範本到 `mochi/` (或指定的資料夾); 會覆寫三個檔案 |
| `npm run validate -- <資料夾或 .companion>` | `uv run tools/companion.py validate <...>` | 驗證; 原因與 app 匯入時顯示的相同 |
| `npm run pack -- <資料夾> [輸出]` | `uv run tools/companion.py pack <資料夾> [輸出]` | 驗證通過後產生 `.companion`; 沒有指定輸出時寫到目前目錄的 `<id>.companion` |
| `npm run preview -- <資料夾或 .companion> [選項]` | `node tools/preview.mjs <...> [選項]` | 預覽, 截圖到 `preview/<id>/` |
| `npm run selftest` | `uv run tools/companion.py selftest` | 檢查驗證規則與範本 |
| | `uv run tools/companion.py build <資料夾或 .companion> <輸出資料夾>` | 寫出 app 安裝後的 `companion.json` 與 `companion.lottie` (預覽使用) |

預覽的選項:

- `--browser chromium|msedge|chrome`: 預設 `chromium`.
- `--scale 2`: 截圖的解析度倍數.
- `--edges right,bottom,left,top`: 只預覽部分的邊; 上下緣各預覽兩個 `along`.

## 製作流程

1. 複製 `tools/template.mjs` 為新的腳本 (例如 `tools/my-companion.mjs`), 改掉輸出資料夾, manifest 的 `id`, `name`, `author`, 再改外觀與動作.
2. 產生: `node tools/my-companion.mjs my-companion`.
3. 驗證: `npm run validate -- my-companion`. 依照原因修正後重新產生.
4. 預覽: `npm run preview -- my-companion`, 打開 `preview/<id>/sheet.png` 檢查四個邊 (上下緣各兩個方向) 的每個畫面.
5. 打包: `npm run pack -- my-companion`.
6. 在 Stygiomedusa 的 popup 史萊姆分頁按「匯入夥伴包」, 再從「夥伴」選單選擇.

也可以用 Glaxnimate 等 Lottie 工具直接編輯 `animation.json`, 用文字編輯器編輯 `state-machine.json`, 然後從步驟 3 繼續. 但重新執行產生腳本會覆寫手動的修改.

製作中的資料夾也可以放一個已經做好的 `companion.lottie` (dotLottie). 它存在時, 驗證與打包直接使用它, 不讀 `animation.json` 與 `state-machine.json`.

## 預設齒輪

manifest 有 `gear` 時, 夥伴包要自己畫齒輪, 史萊姆不畫. 用 `tools/gear.mjs` 畫出的齒輪與史萊姆原本的齒輪相同:

```js
import { gearLayer, gearSlots } from './gear.mjs';

const gear = gearLayer({
  radius: 24, // 與 manifest 的 gear.radius 相同
  colors: { ink: [0.23, 0.17, 0.2], disc: [1, 0.95, 0.93], outline: [0.91, 0.66, 0.71] },
  ind: 1,
  op: TOTAL_FRAMES,
  scale: gearScale, // keyframe: bud < 0.2 的區段為 [0, 0]
  rotation: gearSpin, // 選用
});
const animation = { /* ... */ slots: gearSlots(), layers: [gear, body] };
```

齒輪的比例 (以齒輪半徑 R 為 1, 與史萊姆的 `gearIcon` 相同):

| 部分 | 形狀 | 線寬 |
|---|---|---|
| 底圓 | 半徑 R 的實心圓; 可加外框 | 外框預設 2.5 |
| 齒 | 半徑 0.5R 的虛線圓; 線段與間隔各為周長的 1/16, 共 8 齒 | 0.3R |
| 軸 | 半徑 0.32R 的圓 | 0.16R |

規則:

- 齒的虛線一定用平頭 (Lottie stroke 的 `lc: 1`). 圓頭 (`lc: 2`) 讓每段兩端各多出半個線寬; 線寬 0.3R 大於間隔, 齒會連成一圈.
- 圖層的 position 是 `gear` vector slot (`"p": { "a": 0, "k": [x, y], "sid": "gear" }`), 不要拆成 x 與 y. app 寫入齒輪中心的畫布座標.
- 只在 `bud ≥ 0.2` 時畫齒輪: 其他區段把 scale 設為 `[0, 0]`. 範本在 `spit` 從 0 長大, `hold` 與 `stillGear` 維持 100, `gulp` 縮小.
- 點擊範圍由 app 固定在齒輪中心, 半徑為 `gear.radius`; 畫面上的抖動與縮放不影響點擊.
- 省略 manifest 的 `gear` 時, 史萊姆照原本的方式畫齒輪, 夥伴包不需要 `gear` slot.

## manifest 欄位

長度單位為邏輯 px.

| 欄位 | 說明 |
|---|---|
| `format` | 格式版本, 目前是 `1` |
| `id` | 小寫英文字母, 數字與連字號; 不能是 `none` 與 Windows 保留的名稱 (`con`, `nul` 等). 匯入時 id 相同的夥伴包會詢問是否取代 |
| `name`, `author` | 選單與清單顯示的名稱與作者 |
| `radius` | 夥伴的半徑; 點擊與 hover 的範圍是這個圓 |
| `canvas` | 畫布的半邊長; 畫布是以夥伴中心為中心, 邊長 `2 × canvas` 的正方形 |
| `gap` | 夥伴中心沿螢幕邊緣離鏈端珠子的距離 |
| `lean` | hover 時往螢幕內側探出的距離, 以 `radius` 為 1 |
| `gear` (選用) | 夥伴自己畫齒輪: `gap` 是齒輪沿邊離鏈端珠子的距離, `radius` 是齒輪的點擊半徑 |
| `jiggle` | 整體柔軟身體: `stiffness`, `damping` 是 spring 的參數, `thin` 是拉長時橫向變窄的比例; `appear`, `hide`, `spit`, `gulp` 是探出, 縮回, 吐出與吸回時給的初速 (正值拉長, 負值壓扁) |
| `kicks` | 進入某個 state 時給柔軟身體的初速: `{ "state 名稱": 初速 }` |

## 畫布座標系

- 動畫的寬高都是 `2 × canvas`, 1 個動畫單位等於 1 個邏輯 px.
- 畫布中心 `(canvas, canvas)` 是夥伴中心. 閒置時夥伴中心在螢幕邊緣上, 畫布靠螢幕外的一半看不到.
- app 不旋轉也不鏡像畫布. 夥伴包依 `edge` 與 `along` 畫出各邊的姿勢, 例如停在右邊時臉要畫在中心的左側 (螢幕內側).
- 鏈端的珠子 (半徑 42) 中心在螢幕內側 42 的位置, 沿螢幕邊緣離夥伴 `gap`. 齒輪中心也在螢幕內側 42, 沿邊在夥伴的另一側, 離珠子 `gear.gap`.

夥伴在鏈的哪一端:

- 停在左邊或右邊: 鏈的上方.
- 停在上緣或下緣: 往螢幕中間. 鏈中點在左半邊或正中間時在鏈的右方, 在右半邊時在鏈的左方.
- 鏈橫跨角落 (L 形): 左上角在上緣鏈的右方, 右上角在上緣鏈的左方, 右下角在右邊鏈的上方, 左下角在左邊鏈的上方.

app 以 `along` 告訴夥伴包從珠子往夥伴的方向:

| `edge` | 螢幕內側的方向 | 從珠子往夥伴的方向 (`along`) |
|---|---|---|
| `right` | 左 (-x) | 上 (-y), `up` |
| `left` | 右 (+x) | 上 (-y), `up` |
| `bottom` | 上 (-y) | 左 (-x) `left` 或右 (+x) `right` |
| `top` | 下 (+y) | 右 (+x) `right` 或左 (-x) `left` |

夥伴停在角落旁時, 珠子或齒輪可能繞到另一條邊; `edge` 與 `along` 以夥伴所在的邊為準 (例如右邊靠近右上角時, 夥伴繞到上緣, `edge` 為 `top`, `along` 為 `left`). 驗證規則已經保證齒輪仍在畫布內.

## input 與 slot

state machine 必須宣告以下 input (型別要相同). 可以另外宣告自己的 input.

| input | 型別 | 說明 |
|---|---|---|
| `edge` | String | 所在的邊: `top`, `right`, `bottom`, `left` |
| `along` | String | 沿所在的邊從鏈往夥伴 (再往齒輪) 的方向: `up`, `left`, `right`; 左右邊一律是 `up` (見「畫布座標系」). app 先送 `along` 再送 `edge` |
| `hovering` | Boolean | 游標在史萊姆上 |
| `dragging` | Boolean | 拖曳中; 這時 app 把夥伴縮回螢幕外 |
| `bud` | Numeric | 齒輪的進度, 0 到 1: hover 時以 0.9 秒 ease-in-out 往 1, 離開或拖曳時往 0 |
| `reducedMotion` | Boolean | 減少動態; 這時請停在不播放的畫面 |

- hover 探出: app 依 `bud` 把畫布往螢幕內側移動, `bud` 到 0.2 時探出 `lean × radius`.
- 齒輪: 見「預設齒輪」. app 在畫布移動時更新 `gear` slot, 所以齒輪在畫面上不動.
- app 事件的初速: 探出開始 (`appear`), 縮回開始 (`hide`), `bud` 往上越過 0.25 (`spit`), 往下越過 0.08 (`gulp`).
- 隨機的閒置動作: 用 `OnLoopComplete` interaction 執行 `SetRandom` 寫入自己的 numeric input, 再以 guard 分支. 範本的 `roll` 就是這樣. app 載入時設定隨機的種子.
- 重畫: app 每個畫面都在 keyframe 之間內插. 以腳本產生 spring 之類的動作時, 逐 frame 烘焙成線性 keyframe; 少數幾個 ease-in-out 的 keyframe 串成的路徑, 每經過一個 keyframe 都會減速到 0.
- 不播放的 state (`autoplay: false`) 只在進入時畫一次; 之後寫入的 slot 不會重畫.

## 驗證規則

`validate`, `pack` 與 app 匯入使用相同的檢查. 以下 `BEAD_RADIUS` = 42, `END_ROOM` = 214 (史萊姆視窗在鏈端預留的長度).

| 規則 | 理由 |
|---|---|
| `16 ≤ radius ≤ 48` | 太小點不到, 太大會蓋住珠子 |
| `gap ≥ BEAD_RADIUS + radius` | 不蓋到鏈端的珠子 |
| `radius ≤ canvas`, `gap + canvas ≤ END_ROOM` | 畫布完整放在視窗內 |
| `0 ≤ lean ≤ 1` | hover 時最多探出一個半徑 |
| `16 ≤ gear.radius ≤ 32` | 與史萊姆原本的齒輪相近 |
| `gear.gap ≥ gap + radius + gear.radius` | 齒輪在夥伴之外 |
| `max(BEAD_RADIUS − lean × radius, 0) + (gear.gap − gap) + gear.radius ≤ canvas` | 齒輪在畫布內, 包含夥伴停在角落旁, 齒輪繞到另一條邊的時候 |
| 動畫寬高都是 `2 × canvas` | 畫布座標與邏輯 px 一比一 |
| state machine 宣告上面六個 input, 型別相同 | input 契約 |
| 有 `gear` 時動畫有 `gear` vector slot | 齒輪位置 |
| 每個 state 都有 `transitions` 陣列, 沒有轉換時寫 `[]` | dotLottie runtime 缺少時無法載入 state machine |
| `kicks` 的 state 都存在 | 避免拼錯而沒有效果 |
| 不含 expressions | 夥伴包不執行程式碼 |
| 夥伴包檔不超過 10 MB, 解開後不超過 20 MB, zip 只含 `companion.json` 與 `companion.lottie` | 安全 |

## `.companion` 與 `.lottie` 的結構

```
<id>.companion (zip)
├── companion.json        manifest
└── companion.lottie      dotLottie v2 (zip)
    ├── manifest.json     {"version":"2","animations":[{"id":"<id>"}],"stateMachines":[{"id":"companion"}]}
    ├── a/<id>.json       animation.json
    └── s/companion.json  state-machine.json
```

`pack` 由 `animation.json` 與 `state-machine.json` 組出 `companion.lottie`: 動畫的 id 是 manifest 的 `id`, state machine 的 id 是 `companion`. 所以 state 的 `animation` 要填 manifest 的 `id`.

## 範本的 state

範本的時間軸分成四段, 每個邊一段; 每段有 `idle`, `blink`, `duck`, `pop`, `open`, `spit`, `hold`, `gulp`, `still`, `stillGear` 等 marker, state 名稱為 `<marker>-<邊>`.

- 閒置: `idle-*` 每播完一輪抽一次 `roll`, 小於 0.2 眨眼, 0.2 到 0.35 縮回 (`duck-*`) 再彈出 (`pop-*`). `kicks` 讓縮回與彈出時身體壓扁與拉長.
- hover: `open-*` 張嘴, `bud ≥ 0.2` 後 `spit-*` 吐出齒輪, `hold-*` 含著齒輪; 離開時 `gulp-*` 吸回, `bud < 0.2` 回到閒置.
- 減少動態: `still-*` 與 `stillGear-*` 的 `autoplay` 為 false, 停在單一畫面.
- 換邊: 停著的 state 依 `edge` 換成另一邊的同一種 state.
- 方向: 麻糬沿邊左右對稱, 齒輪位置由 `gear` slot 決定, 所以宣告 `along` 但不依它分支. 吐出物的路徑依方向而不同時, 要依 `along` 分成不同的 state.
- `step` 是範本自己的 input: `OnComplete` 時設為 1, 表示這個區段播完.

## 預覽

`npm run preview -- <資料夾>` 先執行 `validate` (不通過仍然預覽), 再以 headless 瀏覽器載入 app 使用的 `@lottiefiles/dotlottie-web` 0.81.0, 依 input 契約播放. 每個邊與方向 (`<edge>-<along>`, 上下緣各兩個方向) 截六張:

| 截圖 | 時間點 |
|---|---|
| `idle` | 閒置 1.5 秒後 |
| `spit` | hover 開始 0.6 秒後 (`bud` 約 0.78, 正在吐出) |
| `hold` | `bud` 到 1 之後 1.2 秒 |
| `gulp` | 離開 0.3 秒後 (正在吸回) |
| `still` | 減少動態, 閒置 |
| `stillGear` | 減少動態, hover 且 `bud` 為 1 |

輸出在 `preview/<id>/`: 每張截圖的 PNG, 拼成一張的 `sheet.png`, 以及每張截圖的 state 與 `bud` (`report.json`). 截圖中:

- 灰色: 螢幕外, 實際上看不到.
- 藍色圓: 史萊姆鏈端的珠子.
- 紅色虛線圓: 點擊範圍. 夥伴的圓在 hover 時往內移 `lean × radius`; 齒輪的圓在 `bud ≥ 0.2` 時出現. 齒輪要畫在齒輪的圓內.

預覽只模擬直邊, 不模擬角落, 探出縮回的 spring 與柔軟身體 (`jiggle`, `kicks`); 這些要匯入 app 確認.

## 給 AI 的工作守則

- 用腳本產生 `animation.json` 與 `state-machine.json`, 不要手寫大型 JSON. 從 `tools/template.mjs` 開始改.
- 每次修改後依序執行 `validate` 與 `preview`, 並打開 `preview/<id>/sheet.png` 檢查畫面. 驗證通過不代表畫面正確.
- 檢查 `sheet.png` 的項目: 四個邊的臉都朝螢幕內側; 上下緣兩個方向的吐出物都從嘴飛向齒輪; 夥伴的主要部分在灰色區域外; `spit`, `hold`, `stillGear` 的齒輪在紅色虛線圓內; `idle` 與 `still` 沒有齒輪; `report.json` 的 state 符合預期.
- 齒輪使用 `tools/gear.mjs`; 自己畫虛線時用平頭 (`lc: 1`).
- 不使用 expressions; 每個 state 都要有 `transitions` (可以是 `[]`).
- 角色要是原創的, 不使用他人的角色或商標.

## 維護

工具包在 Stygiomedusa 的 repo (不公開) 中開發. 發版後以 `pnpm companion:publish` 把 app 版本的 tag 中的工具包同步到 stygiomedusa-companions 的根目錄. 同步只取代工具包的頂層項目 (`tools/`, `mochi/`, `package.json`, `README.md` 等), 夥伴的資料夾不變. 不要在 stygiomedusa-companions 直接修改工具包的檔案: 下次同步會覆寫.

以下在 Stygiomedusa 的 repo 中進行:

- `version` 由 `pnpm set-version` 與 app 一起更新. `pnpm companion:publish` 在兩者不同時拒絕發布.
- `companion.py` 移植了 Stygiomedusa 的驗證規則 (`src-tauri/src/companion/`). app 的規則或原因的文字改變時, 同步更新 `companion.py` 與 `tools/cases.json`. Stygiomedusa 的 Rust 測試 `tests/companion_tool_cases.rs` 以 `cases.json` 檢查 app, `npm run selftest` 以同一份檔案檢查 `companion.py`; 兩邊都通過才表示規則一致.
- 在 Stygiomedusa 的 repo 中, `pnpm companion validate|pack <資料夾>` 是 Rust 版本的同一組指令, `pnpm companion:template` 執行 `tools/template.mjs`.
- dotLottie runtime 的版本固定為 app 使用的版本; app 升級 `@lottiefiles/dotlottie-web` 時一起更新 `package.json`.
