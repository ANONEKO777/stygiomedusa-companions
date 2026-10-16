# 動畫的畫法

改外觀或動作之前讀這份: 範本的時間軸怎麼切, 齒輪怎麼畫, 以及 dotLottie runtime 的重畫方式會讓哪些寫法出錯.

## 目錄

1. 範本的 state
2. 預設齒輪
3. 重畫與 keyframe
4. 用 Lottie 工具編輯

## 範本的 state

`tools/template.mjs` 產生的範本「麻糬」把時間軸分成四段, 每個邊一段. 每段有 `idle`, `blink`, `duck`, `pop`, `open`, `spit`, `hold`, `gulp`, `still`, `stillGear` 等 marker. state 名稱為 `<marker>-<邊>`.

- 閒置: `idle-*` 每播完一輪抽一次 `roll`. 小於 0.2 時眨眼; 0.2 到 0.35 時縮回 (`duck-*`) 再彈出 (`pop-*`). `kicks` 讓縮回與彈出時身體壓扁與拉長.
- hover: `open-*` 張嘴. `bud ≥ 0.2` 後 `spit-*` 吐出齒輪, `hold-*` 含著齒輪. 離開時 `gulp-*` 吸回, `bud < 0.2` 時回到閒置.
- 減少動態: `still-*` 與 `stillGear-*` 的 `autoplay` 為 false, 停在單一畫面.
- 換邊: 停著的 state 依 `edge` 換成另一邊的同一種 state.
- 方向: 麻糬沿邊左右對稱, 齒輪位置由 `gear` slot 決定, 所以宣告 `along` 但不依它分支. 吐出物的路徑依方向而不同時, 要依 `along` 分成不同的 state.
- `step` 是範本自己的 input: `OnComplete` 時設為 1, 表示這個區段播完.

新的夥伴通常保留這個 state 結構, 只改外觀與各區段的動作. 這樣 hover, 減少動態與換邊的行為不用重新設計.

## 預設齒輪

manifest 有 `gear` 時, 夥伴包要自己畫齒輪, 史萊姆不畫. 用 `tools/gear.mjs` 畫出的齒輪與史萊姆原本的齒輪相同:

```js
import { gearLayer, gearSlots } from '../tools/gear.mjs';

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

齒輪的比例 (以齒輪半徑 R 為 1, 與史萊姆的齒輪相同):

| 部分 | 形狀 | 線寬 |
|---|---|---|
| 底圓 | 半徑 R 的實心圓; 可加外框 | 外框預設 2.5 |
| 齒 | 半徑 0.5R 的虛線圓; 線段與間隔各為周長的 1/16, 共 8 齒 | 0.3R |
| 軸 | 半徑 0.32R 的圓 | 0.16R |

規則與原因:

- 齒的虛線一定用平頭 (Lottie stroke 的 `lc: 1`). 圓頭 (`lc: 2`) 讓每段兩端各多出半個線寬. 線寬 0.3R 大於間隔, 齒會連成一圈.
- 圖層的 position 是 `gear` vector slot (`"p": { "a": 0, "k": [x, y], "sid": "gear" }`), 不要拆成 x 與 y. app 會寫入齒輪中心的畫布座標; 拆開的 position 改用 scalar slot 時, dotLottie runtime 會當掉.
- 只在 `bud ≥ 0.2` 時畫齒輪: 其他區段把 scale 設為 `[0, 0]`. 範本在 `spit` 從 0 長大, `hold` 與 `stillGear` 維持 100, `gulp` 縮小.
- 點擊範圍由 app 固定在齒輪中心, 半徑為 `gear.radius`. 畫面上的抖動與縮放不影響點擊.
- 省略 manifest 的 `gear` 時, 史萊姆照原本的方式畫齒輪, 夥伴包不需要 `gear` slot.

## 重畫與 keyframe

- app 每個畫面都在 keyframe 之間內插. 以腳本產生 spring 之類的動作時, 要逐 frame 烘焙成線性 keyframe. 用少數幾個 ease-in-out 的 keyframe 串成路徑時, 每經過一個 keyframe 都會減速到 0, 看起來會一頓一頓.
- 不播放的 state (`autoplay: false`) 只在進入時畫一次. 之後寫入的 slot 不會重畫, 所以這些畫面中的齒輪位置以進入時為準.
- 不使用 expressions: 驗證會拒絕.
- 用腳本產生 `animation.json` 與 `state-machine.json`, 不要手寫大型 JSON. 腳本可以重跑, 修改也比較容易檢查. `tools/lottie.mjs` 提供基本元件 (圓, 填色, 線條, 群組).

## 用 Lottie 工具編輯

也可以用 Glaxnimate 等 Lottie 工具直接編輯 `animation.json`, 用文字編輯器編輯 `state-machine.json`, 再從 validate 繼續. 但重新執行產生腳本會覆寫手動的修改. 所以修改既有的夥伴前, 先確認使用者沒有手動編輯過這些檔案.
