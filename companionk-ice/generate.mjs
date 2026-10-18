// 夥伴K 冰: 夥伴K 頭上戴著水晶冰冠 (金色的冠環, 中間一顆紅寶石), 身邊閃著雪花; 吐出的星星是淡藍色.
// 沒有拿武器. 身體與動作都與夥伴K相同, 共用 companionk-core/core.mjs; 這裡畫冰冠與雪花, 以及出場 (溜冰滑進來)
// 與退場 (凍成冰塊滑走).
// 產物寫到 ./companion/, 再於 repo 的根目錄以
// `npm run pack -- companionk-ice/companion companionk-ice/companionk-ice.companion` 打包.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../companionk-core/core.mjs';

const ID = 'companionk-ice';

/** 冰晶 (以夥伴半徑為 1): 底部中心的 x, 高度, 寬度, 往外歪多少. */
const CRYSTALS = [
  { x: -0.62, height: 0.62, width: 0.2, lean: -0.22 },
  { x: 0.62, height: 0.68, width: 0.2, lean: 0.22 },
  { x: -0.33, height: 0.95, width: 0.23, lean: -0.1 },
  { x: 0.33, height: 1.0, width: 0.23, lean: 0.1 },
  { x: 0, height: 1.25, width: 0.27, lean: 0 },
];
/** 雪花: 位置 (夥伴的座標), 大小, 閃爍的相位. */
const FLAKES = [
  { at: [-1.3, -1.1], size: 0.3, phase: 0 },
  { at: [1.4, -0.85], size: 0.24, phase: 2.1 },
  { at: [-1.0, -1.85], size: 0.2, phase: 4.2 },
];
/** 退場的冰塊 (夥伴的座標): 中心, 半寬與半高, 圓角的半徑. */
const BLOCK = { center: [0, -0.4], half: [1.5, 1.7], corner: 0.35 };

const ability = {
  id: ID,
  name: '夥伴K 冰',
  star: { fill: [0.85, 0.95, 1], outline: [0.35, 0.65, 0.9] },

  hat(k) {
    const { hex, px, group, polygon, bandPoints, ellipse, fill, stroke, transform, value, track, OUTLINE } = k;
    const line = px(OUTLINE);
    const ice = hex('#c9e9ff');
    const iceLight = hex('#f2fbff');
    const iceDark = hex('#4f98d3');
    const gold = hex('#f2b84b');
    const goldDark = hex('#b87a12');
    const gem = hex('#e8433a');
    const gemDark = hex('#8c1d18');
    const flake = hex('#e8f7ff');
    const flakeDark = hex('#5fa8e6');
    const crystals = [...CRYSTALS].sort((a, b) => b.height - a.height).map((crystal) => {
      const { x, height, width, lean } = crystal;
      const bottom = -0.68;
      const top = [x + lean * height, bottom - height];
      const shoulder = bottom - height * 0.6;
      const points = [[x - width, bottom], [x - width * 0.85 + lean * height * 0.6, shoulder], top, [x + width * 0.85 + lean * height * 0.6, shoulder], [x + width, bottom]];
      const facet = [[x, bottom], [x + width * 0.85 + lean * height * 0.6, shoulder], top, [x + lean * height * 0.4, shoulder]];
      return group('crystal', [
        group('facet', [polygon('facet', facet), fill(iceLight, 75)]),
        group('crystal', [polygon('crystal', points), stroke(iceDark, line), fill(ice)]),
      ]);
    });
    const flakePoints = Array.from({ length: 8 }, (_, index) => {
      const radius = index % 2 === 0 ? 1 : 0.22;
      const angle = (index * Math.PI) / 4 - Math.PI / 2;
      return [radius * Math.cos(angle), radius * Math.sin(angle)];
    });
    const flakes = FLAKES.map((item, index) =>
      group(
        `flake ${index}`,
        [group('flake', [polygon('flake', flakePoints.map(([x, y]) => [x * item.size, y * item.size])), stroke(flakeDark, px(0.035)), fill(flake)])],
        transform({ p: value([px(item.at[0]), px(item.at[1])]), s: track(`flake${index}Scale`), r: track(`flake${index}Spin`) }),
      ),
    );
    return [
      group('jewel', [ellipse('jewel', [0, px(-0.58)], [px(0.26), px(0.26)]), stroke(gemDark, px(0.045)), fill(gem)]),
      group('circlet', [polygon('circlet', bandPoints(-0.8, -0.5, 0.1, 1.06)), stroke(goldDark, line), fill(gold)]),
      ...crystals,
      ...flakes,
    ];
  },

  /** 退場的冰塊: 圓角的方塊把夥伴K (含冰冠) 整個包起來, 半透明, 左上有兩道反光. */
  outer(k) {
    const { hex, px, group, polygon, path, arcPoints, fill, stroke, transform, value, track, OUTLINE } = k;
    const { center, half, corner } = BLOCK;
    const corners = [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]];
    const outline = corners.flatMap(([sx, sy, from]) =>
      arcPoints(center[0] + sx * (half[0] - corner), center[1] + sy * (half[1] - corner), corner, from, from + 90, 4),
    );
    const shine = (points) => group('shine', [path('shine', points.map(([x, y]) => [px(x), px(y)])), stroke(hex('#ffffff'), px(0.12))]);
    return [
      group('ice block', [
        shine([[-1.05, -1.2], [-0.6, -1.65]]),
        shine([[-1.05, -0.75], [-0.75, -1.05]]),
        group('block', [polygon('block', outline), stroke(hex('#4f98d3'), px(OUTLINE)), fill(hex('#c9e9ff'), 55)]),
      ], transform({ p: value([px(center[0]), px(center[1])]), a: value([px(center[0]), px(center[1])]), s: track('block'), o: track('blockOpacity') })),
    ];
  },

  /** 出場: 從邊斜斜地溜冰滑進來, 身體往後仰著剎車, 腳下噴出冰屑, 停住時彈一下. */
  enter: {
    seconds: 1.4,
    sample(view, t, k) {
      const { rest, span, lerp, easeInOut, boing, place, lateral, EDGES, AWAY, R } = k;
      const glide = 0.7;
      const { edge } = view;
      const wall = EDGES[edge].dir[0] !== 0;
      const state = rest(t - 1.4);
      const at = (s) => {
        const x = 1 - (1 - span(s, [0, glide])) ** 2;
        return { inset: lerp(-AWAY, 0, x), slide: 2 * (1 - x) };
      };
      Object.assign(state, at(t));
      state.out = 1 - easeInOut(span(t, [glide, 1.1]));
      state.open = t < glide ? 0.35 : 0;
      // 往後仰 (頭朝來的方向): 上下緣的 `slide` 為正是夥伴K的右手邊, 轉正的角度就是往右仰.
      if (!wall) state.spin = 12 * Math.sin(Math.PI * span(t, [0.3, 1.0]));
      state.squash = boing(t - glide, 0.18);
      // 冰屑: 從腳往前 (滑行的方向) 與往螢幕內側噴出.
      const forward = lateral(edge).map((number) => -number);
      const inward = EDGES[edge].dir;
      state.glitter = Array.from({ length: 6 }, (_, index) => {
        const spawn = 0.35 + index * 0.06;
        const age = (t - spawn) / 0.4;
        if (age < 0 || age >= 1) return null;
        const { inset, slide } = at(spawn);
        const feet = place(edge, inset, slide, [0, 0.95]);
        const spread = (index % 3) * 0.35;
        return { at: [feet[0] + R * age * (forward[0] * (1.4 + spread) + inward[0] * (1.2 - spread)), feet[1] + R * age * (forward[1] * (1.4 + spread) + inward[1] * (1.2 - spread))], size: 0.35 * (1 - age) };
      });
      return state;
    },
  },

  /** 退場: 冰塊從四周長出來把自己凍住, 閃一下, 再整塊滑回螢幕外. */
  leave: {
    seconds: 1.6,
    sample(view, t, k) {
      const { rest, span, easeIn, easeInOut, easeOutBack, place, AWAY } = k;
      const form = span(t, [0, 0.4]);
      // 凍住後呼吸停下來.
      const state = rest(Math.min(t, 0.4));
      state.out = easeInOut(span(t, [0, 0.25]));
      state.inhaling = t > 0.15;
      state.block = form > 0 ? easeOutBack(form) : 0;
      state.inset = -AWAY * easeIn(span(t, [0.7, 1.6]));
      state.glitter = [[-1.2, -1.8], [1.25, -0.2], [-0.9, 1.0]].map((local, index) => {
        const twinkle = Math.sin(Math.PI * span(t, [0.4 + index * 0.08, 0.7 + index * 0.08]));
        return twinkle > 0 ? { at: place(view.edge, state.inset, 0, local), size: 0.4 * twinkle } : null;
      });
      return state;
    },
  },

  /** 雪花一閃一閃地縮放, 慢慢轉. */
  frame({ state, values }) {
    const phase = (2 * Math.PI * state.time) / 2.8;
    FLAKES.forEach((item, index) => {
      const twinkle = state.still ? 0.8 : 0.55 + 0.45 * Math.sin(phase + item.phase);
      values[`flake${index}Scale`] = [100 * twinkle, 100 * twinkle];
      values[`flake${index}Spin`] = state.still ? 0 : (state.time / 2.8) * 90 + item.phase * 20;
    });
    const block = state.block ?? 0;
    values.block = [100 * block, 100 * block];
    values.blockOpacity = block > 0 ? 100 : 0;
  },
};

build(ability, join(dirname(fileURLToPath(import.meta.url)), 'companion'));
