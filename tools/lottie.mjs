// Lottie JSON 的基本元件: 只產生 JSON 物件, 不依賴任何套件. 範本 (`template.mjs`) 與預設齒輪 (`gear.mjs`) 共用.
// 顏色是 0 到 1 的 `[r, g, b]`; 長度是畫布座標 (1 單位 = 1 邏輯 px).

/** 固定值的屬性. */
export const value = (k) => ({ a: 0, k });

/** `size` 是固定的 `[寬, 高]` 或 keyframe 屬性. */
export function ellipse(name, position, size) {
  return { ty: 'el', nm: name, p: value(position), s: Array.isArray(size) ? value(size) : size };
}

export const fill = (color) => ({ ty: 'fl', nm: 'fill', c: value([...color, 1]), o: value(100), r: 1 });

/**
 * 線條. `dashes` 為虛線的線段長 (間隔相同). 虛線一律用平頭 (`lc: 1`): 圓頭會讓每段兩端各多出半個線寬,
 * 線寬大於間隔時線段會連成一圈. 實線用圓頭 (`lc: 2`).
 */
export const stroke = (color, width, dashes) => ({
  ty: 'st',
  nm: 'stroke',
  c: value([...color, 1]),
  o: value(100),
  w: value(width),
  lc: dashes ? 1 : 2,
  lj: 2,
  ...(dashes ? { d: [{ n: 'd', nm: 'dash', v: value(dashes) }, { n: 'g', nm: 'gap', v: value(dashes) }] } : {}),
});

export const transform = (extra = {}) => ({
  ty: 'tr',
  nm: 'transform',
  p: value([0, 0]),
  a: value([0, 0]),
  s: value([100, 100]),
  r: value(0),
  o: value(100),
  ...extra,
});

/** 群組: 前面的項目畫在上面; 最後一項是群組的 transform. */
export const group = (name, items, tr = transform()) => ({ ty: 'gr', nm: name, it: [...items, tr] });

export const add = (a, b, scale = 1) => [a[0] + b[0] * scale, a[1] + b[1] * scale];
