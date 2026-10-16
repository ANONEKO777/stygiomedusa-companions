// 夥伴K 冰: 夥伴K 頭上戴著水晶冰冠 (金色的冠環, 中間一顆紅寶石), 身邊閃著雪花; 吐出的星星是淡藍色.
// 沒有拿武器. 身體與動作都與夥伴K相同, 共用 companionk-core/core.mjs; 這裡只畫冰冠與雪花.
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

  /** 雪花一閃一閃地縮放, 慢慢轉. */
  frame({ state, values }) {
    const phase = (2 * Math.PI * state.time) / 2.8;
    FLAKES.forEach((item, index) => {
      const twinkle = state.still ? 0.8 : 0.55 + 0.45 * Math.sin(phase + item.phase);
      values[`flake${index}Scale`] = [100 * twinkle, 100 * twinkle];
      values[`flake${index}Spin`] = state.still ? 0 : (state.time / 2.8) * 90 + item.phase * 20;
    });
  },
};

build(ability, join(dirname(fileURLToPath(import.meta.url)), 'companion'));
