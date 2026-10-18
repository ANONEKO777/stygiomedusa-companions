# 夥伴包的格式

產生之前讀這份: manifest 的數值, 畫布座標, input 契約與驗證規則決定了動畫要怎麼畫. 長度單位都是邏輯 px.

## 目錄

1. 契約區塊
2. manifest 欄位
3. 畫布座標系
4. 夥伴的位置與 `along`
5. input 與 slot
6. 驗證規則
7. `.companion` 與 `.lottie` 的結構

## 契約區塊

驗證規則的常數與 input 契約. 本文以鍵名引用這些值. stygiomedusa 的測試與 `npm run selftest` 會檢查這個區塊與驗證規則相同, 請不要手動修改.

<!-- contract:begin -->
```json
{
  "BEAD_RADIUS": 42,
  "END_ROOM": 214,
  "radius": [16, 48],
  "lean": [0, 1],
  "gear.radius": [16, 32],
  "PACK_LIMIT": 10485760,
  "UNPACKED_LIMIT": 20971520,
  "inputs": [
    ["edge", "String"],
    ["along", "String"],
    ["hovering", "Boolean"],
    ["dragging", "Boolean"],
    ["bud", "Numeric"],
    ["reducedMotion", "Boolean"]
  ],
  "optionalInputs": [
    ["exit", "Event"],
    ["enter", "Event"]
  ],
  "exitedState": "exited"
}
```
<!-- contract:end -->

- `BEAD_RADIUS`: 史萊姆鏈端珠子的半徑.
- `END_ROOM`: 史萊姆視窗在鏈端預留的長度 (從鏈端珠子的中心算起).
- `radius`, `lean`, `gear.radius`: 對應 manifest 欄位允許的範圍 (含兩端).
- `PACK_LIMIT`, `UNPACKED_LIMIT`: `.companion` 檔與解開後的大小上限 (bytes).
- `inputs`: state machine 必須宣告的 input 與型別.
- `optionalInputs`: state machine 可以選擇宣告的出場與退場 event 與型別.
- `exitedState`: 宣告 `exit` 時必須有的 state 名稱, 進入它代表退場播完.

## manifest 欄位

manifest 是夥伴資料夾中的 `companion.json`.

| 欄位 | 說明 |
|---|---|
| `format` | 格式版本, 目前是 `1` |
| `id` | 小寫英文字母, 數字與連字號; 不能是 `none` 與 Windows 保留的名稱 (`con`, `nul` 等). 匯入時 id 相同的夥伴包會詢問是否取代 |
| `name`, `author` | 選單與清單顯示的名稱與作者 |
| `radius` | 夥伴的半徑; 點擊與 hover 的範圍是這個圓 |
| `canvas` | 畫布的半邊長; 畫布是以夥伴中心為中心, 邊長 `2 × canvas` 的正方形 |
| `gap` | 夥伴中心沿螢幕邊緣離鏈端珠子的距離 |
| `lean` | hover 時往螢幕內側探出的距離, 以 `radius` 為 1 |
| `gear` (選用) | 夥伴自己畫齒輪: `gap` 是齒輪沿邊離鏈端珠子的距離, `radius` 是齒輪的點擊半徑. 見 `animation.md` 的「預設齒輪」 |
| `jiggle` | 整體柔軟身體: `stiffness`, `damping` 是 spring 的參數, `thin` 是拉長時橫向變窄的比例; `appear`, `hide`, `spit`, `gulp` 是探出, 縮回, 吐出與吸回時給的初速 (正值拉長, 負值壓扁) |
| `kicks` | 進入某個 state 時給柔軟身體的初速: `{ "state 名稱": 初速 }` |

## 畫布座標系

- 動畫的寬高都是 `2 × canvas`, 1 個動畫單位等於 1 個邏輯 px.
- 畫布中心 `(canvas, canvas)` 是夥伴中心. 閒置時夥伴中心在螢幕邊緣上, 畫布靠螢幕外的一半看不到.
- app 不旋轉也不鏡像畫布. 夥伴包要依 `edge` 與 `along` 畫出各邊的姿勢. 例如停在右邊時, 臉要畫在中心的左側 (螢幕內側).
- 鏈端的珠子 (半徑 `BEAD_RADIUS`) 的中心在螢幕內側 `BEAD_RADIUS` 的位置, 沿螢幕邊緣離夥伴 `gap`. 齒輪中心也在螢幕內側 `BEAD_RADIUS`, 沿邊在夥伴的另一側, 離珠子 `gear.gap`.

## 夥伴的位置與 `along`

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

夥伴停在角落旁時, 珠子或齒輪可能繞到另一條邊. `edge` 與 `along` 以夥伴所在的邊為準. 例如停在右邊靠近右上角時, 夥伴繞到上緣, `edge` 為 `top`, `along` 為 `left`. 驗證規則已經保證齒輪仍在畫布內.

所以上下緣各有兩種方向. 吐出物的路徑依方向而不同時, 要依 `along` 分成不同的 state.

## input 與 slot

state machine 必須宣告契約區塊 `inputs` 中的每個 input, 型別要相同. 契約區塊 `optionalInputs` 中的 input 可以不宣告; 宣告時型別要相同. 也可以另外宣告自己的 input.

| input | 型別 | 說明 |
|---|---|---|
| `edge` | String | 所在的邊: `top`, `right`, `bottom`, `left` |
| `along` | String | 沿所在的邊從鏈往夥伴 (再往齒輪) 的方向: `up`, `left`, `right`; 左右邊一律是 `up`. app 先送 `along` 再送 `edge` |
| `hovering` | Boolean | 游標在史萊姆上 |
| `dragging` | Boolean | 拖曳中; 這時 app 把夥伴縮回螢幕外 |
| `bud` | Numeric | 齒輪的進度, 0 到 1: hover 時以 0.9 秒 ease-in-out 往 1, 離開或拖曳時往 0 |
| `reducedMotion` | Boolean | 減少動態; 這時請停在不播放的畫面 |
| `enter` | Event (選用) | 出場: app 把夥伴放在探出的位置後觸發 |
| `exit` | Event (選用) | 退場: app 在原地觸發, 等夥伴包進入 `exitedState` (`exited`) |

出場與退場 (選用):

- app 在換夥伴, 從無加入, 改為無與移除時使用. 拖曳, 重新啟動與取代同 id 的夥伴包時不使用.
- 沒有宣告 `enter` 時, app 從無加入時探出, 換夥伴時淡入. 沒有宣告 `exit` 時, app 改為無時縮回, 換夥伴時淡出.
- app 觸發 `exit` 後不再送其他 input. 退場要播到 `exited` state, 那個畫面要看不到夥伴. 5 秒內沒有進入 `exited` 時, app 改為淡出.
- 觸發 `exit` 時 state 沒有改變 (目前的 state 沒有 `exit` 的轉換), app 立即淡出. 所以每個會停留的 state 都要能轉到退場.
- 觸發 `enter` 時 state 沒有改變, app 直接顯示目前的畫面. 減少動態時 app 仍會觸發, 建議的結構在 `still-*` 不轉換, 退場直接進入 `exited`.

- hover 探出: app 依 `bud` 把畫布往螢幕內側移動. `bud` 到 0.2 時, 探出 `lean × radius`.
- 齒輪: app 在畫布移動時更新 `gear` slot, 所以齒輪在畫面上不動. 見 `animation.md`.
- app 事件的初速: 探出開始 (`appear`), 縮回開始 (`hide`), `bud` 往上越過 0.25 (`spit`), 往下越過 0.08 (`gulp`).
- 隨機的閒置動作: 用 `OnLoopComplete` interaction 執行 `SetRandom`, 寫入自己的 numeric input, 再以 guard 分支. 建議的結構以 `roll` 這樣做. app 載入時會設定隨機的種子.

## 驗證規則

`validate`, `pack` 與 app 匯入使用相同的檢查. 不通過時, 輸出的原因與 app 匯入時顯示的相同. 依照原因修改產生腳本, 再重新產生.

| 規則 | 理由 |
|---|---|
| `radius` 在契約的 `radius` 範圍內 | 太小點不到, 太大會蓋住珠子 |
| `gap ≥ BEAD_RADIUS + radius` | 不蓋到鏈端的珠子 |
| `radius ≤ canvas`, `gap + canvas ≤ END_ROOM` | 畫布完整放在視窗內 |
| `lean` 在契約的 `lean` 範圍內 | hover 時最多探出一個半徑 |
| `gear.radius` 在契約的 `gear.radius` 範圍內 | 與史萊姆原本的齒輪相近 |
| `gear.gap ≥ gap + radius + gear.radius` | 齒輪在夥伴之外 |
| `max(BEAD_RADIUS − lean × radius, 0) + (gear.gap − gap) + gear.radius ≤ canvas` | 齒輪在畫布內, 包含夥伴停在角落旁, 齒輪繞到另一條邊的時候 |
| 動畫寬高都是 `2 × canvas` | 畫布座標與邏輯 px 一比一 |
| state machine 宣告契約的每個 input, 型別相同 | input 契約 |
| 宣告 `optionalInputs` 中的 input 時, 型別相同 | app 以 Event 觸發 |
| 宣告 `exit` 時, 有名為 `exitedState` 的 state | app 以進入它判斷退場播完 |
| 有 `gear` 時動畫有 `gear` vector slot | 齒輪位置 |
| 每個 state 都有 `transitions` 陣列, 沒有轉換時寫 `[]` | dotLottie runtime 缺少時無法載入 state machine |
| `kicks` 的 state 都存在 | 避免拼錯而沒有效果 |
| 不含 expressions | 夥伴包不執行程式碼 |
| 夥伴包檔不超過 `PACK_LIMIT`, 解開後不超過 `UNPACKED_LIMIT`, zip 只含 `companion.json` 與 `companion.lottie` | 安全 |

## `.companion` 與 `.lottie` 的結構

```
<id>.companion (zip)
├── companion.json        manifest
└── companion.lottie      dotLottie v2 (zip)
    ├── manifest.json     {"version":"2","animations":[{"id":"<id>"}],"stateMachines":[{"id":"companion"}]}
    ├── a/<id>.json       animation.json
    └── s/companion.json  state-machine.json
```

`pack` 由 `animation.json` 與 `state-machine.json` 組出 `companion.lottie`. 動畫的 id 是 manifest 的 `id`, state machine 的 id 是 `companion`. 所以每個 state 的 `animation` 都要填 manifest 的 `id`.

夥伴資料夾中也可以放一個已經做好的 `companion.lottie`. 它存在時, 驗證與打包直接使用它, 不讀 `animation.json` 與 `state-machine.json`.
