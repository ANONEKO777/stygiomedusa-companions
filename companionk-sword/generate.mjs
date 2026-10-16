// 夥伴K 劍士: 夥伴K 戴著綠色尖帽 (黃色帽緣, 尾巴末端一顆金色絨球), 手上握著水晶劍.
// 身體與動作都與夥伴K相同, 共用 companionk-core/core.mjs; 這裡只畫帽子與劍.
// 產物寫到 ./companion/, 再於 repo 的根目錄以
// `npm run pack -- companionk-sword/companion companionk-sword/companionk-sword.companion` 打包.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../companionk-core/core.mjs';

const ID = 'companionk-sword';

const ability = {
  id: ID,
  name: '夥伴K 劍士',
  star: { fill: [1, 0.9, 0.4], outline: [0.88, 0.6, 0] },

  /** 帽子: 圓頂, 黃色帽緣, 往右後方垂下的尾巴 (隨呼吸輕輕擺動). */
  hat(k) {
    const { hex, px, group, path, polygon, smooth, domePoints, bandPoints, ellipse, fill, stroke, transform, value, track, OUTLINE } = k;
    const green = hex('#58b845');
    const greenDark = hex('#2e7d32');
    const yellow = hex('#f7de7e');
    const yellowDark = hex('#c9a227');
    const gold = hex('#f6c71c');
    const goldDark = hex('#c58a00');
    const line = px(OUTLINE);
    const base = [0.3, -1.1];
    const tail = group('tail', [
      group('pompom', [ellipse('pompom', [px(1.52), px(-0.22)], [px(0.46), px(0.46)]), stroke(goldDark, line), fill(gold)]),
      group('tail', [
        smooth('tail', [[0.0, -1.3], [0.7, -1.3], [1.3, -1.0], [1.55, -0.4], [1.3, -0.4], [1.0, -0.75], [0.5, -0.95]]),
        stroke(greenDark, line),
        fill(green),
      ]),
    ], transform({ p: value([px(base[0]), px(base[1])]), a: value([px(base[0]), px(base[1])]), r: track('hatSway') }));
    return [
      group('band', [polygon('band', bandPoints(-0.8, -0.5, 0.1, 1.05)), stroke(yellowDark, line), fill(yellow)]),
      group('dome', [polygon('dome', domePoints(-0.5, 1.09, -0.02, 24).map(([x, y]) => [x, y < -0.5 ? -0.5 + (y + 0.5) * 1.3 : y])), stroke(greenDark, line), fill(green)]),
      tail,
    ];
  },

  /** 水晶劍: 原點在手, 劍尖往上. */
  held(k) {
    const { hex, px, group, polygon, smooth, ellipse, fill, stroke, transform, track, OUTLINE } = k;
    const line = px(OUTLINE);
    const blade = hex('#b9e2f7');
    const bladeLight = hex('#eaf7ff');
    const bladeDark = hex('#5aa6d4');
    const guard = hex('#2f90c8');
    const guardDark = hex('#175f8d');
    const gem = hex('#ff9a1f');
    const gemDark = hex('#c4600a');
    const bladePoints = [[-0.17, -0.62], [0.17, -0.62], [0.22, -1.3], [0, -1.95], [-0.22, -1.3]];
    return [
      group(
        'sword',
        [
          group('gem', [ellipse('gem', [0, px(-0.5)], [px(0.26), px(0.26)]), stroke(gemDark, px(0.05)), fill(gem)]),
          group('guard', [
            smooth('guard', [[-0.5, -0.7], [-0.28, -0.44], [0, -0.36], [0.28, -0.44], [0.5, -0.7], [0.38, -0.5], [0.14, -0.28], [-0.14, -0.28], [-0.38, -0.5]]),
            stroke(guardDark, line),
            fill(guard),
          ]),
          group('shine', [polygon('shine', [[0.02, -0.65], [0.17, -0.62], [0.22, -1.3], [0, -1.95]]), fill(bladeLight, 70)]),
          group('blade', [polygon('blade', bladePoints), stroke(bladeDark, line), fill(blade)]),
          group('grip', [polygon('grip', [[-0.1, 0.14], [0.1, 0.14], [0.1, -0.34], [-0.1, -0.34]]), stroke(guardDark, line), fill(guard)]),
        ],
        transform({ p: track('hand'), r: track('weaponRot'), s: k.value([120, 120]) }),
      ),
    ];
  },

  /** 劍微微搖晃, 向外傾; hover 探出時舉高 (往內收). 帽子的尾巴隨呼吸擺動. */
  frame({ side, state, values }) {
    const phase = (2 * Math.PI * state.time) / 2.8;
    const sway = state.still ? 0 : Math.sin(phase);
    values.weaponRot = side * (14 - 8 * state.out) + 3 * sway;
    values.hatSway = state.still ? 0 : 7 * Math.sin(phase - 0.9) * (1 - 0.5 * state.out);
  },
};

build(ability, join(dirname(fileURLToPath(import.meta.url)), 'companion'));
