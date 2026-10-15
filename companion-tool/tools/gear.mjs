// 預設齒輪: 與史萊姆原本的齒輪相同的外觀 (stygiomedusa `src/BubbleWindow.vue` 的 `gearIcon`).
// 夥伴包的 manifest 有 `gear` 時, 夥伴包要自己畫齒輪; 用這裡的 `gearLayer` 就和史萊姆畫的一樣.
import { ellipse, fill, group, stroke, value } from './lottie.mjs';

/** app 寫入齒輪中心 (畫布座標) 的 vector slot 名稱. */
export const GEAR_SLOT = 'gear';

/**
 * 齒輪各部分與齒輪半徑 `R` 的比例 (與史萊姆相同):
 * - 底圓: 半徑 R.
 * - 齒: 半徑 0.5R 的粗虛線圓, 線寬 0.3R; 線段與間隔各為周長的 1/16, 共 8 齒; 平頭.
 * - 軸: 半徑 0.32R 的圓, 線寬 0.16R.
 */
export const GEAR_RATIO = { teeth: 0.5, teethWidth: 0.3, segments: 16, hub: 0.32, hubWidth: 0.16 };

/**
 * 齒輪的 shapes (中心在 `[0, 0]`): 軸, 齒, 底圓, 依序由上到下.
 * `ink` 是齒與軸的顏色, `disc` 是底圓; `outline` 與 `outlineWidth` 是底圓的外框 (省略時沒有外框).
 */
export function gearShapes(radius, { ink, disc, outline, outlineWidth = 2.5 }) {
  const teeth = radius * GEAR_RATIO.teeth;
  const dash = (2 * Math.PI * teeth) / GEAR_RATIO.segments;
  const hub = radius * GEAR_RATIO.hub;
  return [
    group('hub', [ellipse('hub', [0, 0], [2 * hub, 2 * hub]), stroke(ink, radius * GEAR_RATIO.hubWidth)]),
    group('teeth', [ellipse('teeth', [0, 0], [2 * teeth, 2 * teeth]), stroke(ink, radius * GEAR_RATIO.teethWidth, dash)]),
    group('disc', [ellipse('disc', [0, 0], [2 * radius, 2 * radius]), ...(outline ? [stroke(outline, outlineWidth)] : []), fill(disc)]),
  ];
}

/**
 * 齒輪圖層: position 是 `gear` slot (不要拆成 x 與 y), app 寫入齒輪中心. `scale` 與 `rotation` 是 keyframe
 * 屬性或固定值; 只在 `bud ≥ 0.2` 時把 `scale` 設為非 0, 其他時候為 `[0, 0]` (不畫).
 * `rest` 是 slot 的預設值, 只在 app 寫入前使用.
 */
export function gearLayer({ radius, colors, ind, op, scale, rotation = value(0), rest = [0, 0], name = 'gear' }) {
  return {
    ty: 4,
    nm: name,
    ind,
    ip: 0,
    op,
    st: 0,
    sr: 1,
    ks: { a: value([0, 0]), p: { a: 0, k: rest, sid: GEAR_SLOT }, s: scale, r: rotation, o: value(100) },
    shapes: gearShapes(radius, colors),
  };
}

/** 動畫根層級的 `slots`: 宣告 `gear` vector slot. */
export const gearSlots = (rest = [0, 0]) => ({ [GEAR_SLOT]: { p: value(rest) } });
