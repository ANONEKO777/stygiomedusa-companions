# 預覽與檢查

每次產生之後讀這份. 驗證通過只代表格式正確, 不代表畫面正確: 臉朝錯邊, 齒輪飛錯方向都能通過驗證. 所以每次修改都要看預覽.

## 執行

```
npm run preview -- <id>/companion [--browser chromium|msedge|chrome] [--scale 2] [--edges right,bottom,left,top]
```

- 先執行 `validate`. 不通過仍然會預覽, 但先修正驗證的原因.
- 以 headless 瀏覽器載入 app 使用的 `@lottiefiles/dotlottie-web` (版本與 app 相同), 依 input 契約播放.
- `--browser`: 預設 `chromium`, 要先執行 `npm run setup:browser`. Windows 通常已經有 Edge, 用 `--browser msedge` 不需要下載.
- `--edges`: 只預覽部分的邊. 只改了一個邊的姿勢時, 可以先只預覽那個邊, 最後再預覽全部.

## 截圖

每個邊與方向 (`<edge>-<along>`; 上下緣各兩個方向) 截六張:

| 截圖 | 時間點 |
|---|---|
| `idle` | 閒置 1.5 秒後 |
| `spit` | hover 開始 0.6 秒後 (`bud` 約 0.78, 正在吐出) |
| `hold` | `bud` 到 1 之後 1.2 秒 |
| `gulp` | 離開 0.3 秒後 (正在吸回) |
| `still` | 減少動態, 閒置 |
| `stillGear` | 減少動態, hover 且 `bud` 為 1 |

輸出在 `preview/<id>/`:

- 每張截圖的 PNG.
- `sheet.png`: 所有截圖拼成一張. 先看這張.
- `report.json`: 每張截圖的 state 與 `bud`.

截圖中的標記:

- 灰色: 螢幕外, 實際上看不到.
- 藍色圓: 史萊姆鏈端的珠子.
- 紅色虛線圓: 點擊範圍. 夥伴的圓在 hover 時往內移 `lean × radius`. 齒輪的圓在 `bud ≥ 0.2` 時出現; 齒輪要畫在這個圓內.

## 檢查清單

打開 `sheet.png` 逐項檢查. 有任何一項不符合, 就修改產生腳本, 重新產生, 再預覽一次.

1. 四個邊的臉都朝螢幕內側 (灰色的反方向).
2. 夥伴的主要部分在灰色區域外.
3. 上下緣的兩個方向, 吐出物都從嘴飛向齒輪.
4. `spit`, `hold`, `stillGear` 的齒輪在紅色虛線圓內.
5. `idle` 與 `still` 沒有齒輪.
6. `report.json` 中每張截圖的 state 符合預期 (例如 `hold` 截圖的 state 是 `hold-<邊>`).

無法看圖時, 請使用者打開 `preview/<id>/sheet.png`, 依這份清單回報每一項. 不要只依 `report.json` 判斷畫面正確.

## 預覽沒有模擬的部分

預覽只模擬直邊. 角落, 探出縮回的 spring 與柔軟身體 (`jiggle`, `kicks`) 都沒有模擬. 這些要匯入 app 確認.
