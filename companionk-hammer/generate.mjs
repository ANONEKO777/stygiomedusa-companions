// 夥伴K 鎚子: 夥伴K 額頭綁著藍白的頭巾 (結在左邊, 兩條帶子垂下來), 手上拿著木桶形的大鎚子 (桶身有一顆星星).
// 身體與動作都與夥伴K相同, 共用 companionk-core/core.mjs; 這裡只畫頭巾與鎚子.
// 產物寫到 ./companion/, 再於 repo 的根目錄以
// `npm run pack -- companionk-hammer/companion companionk-hammer/companionk-hammer.companion` 打包.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../companionk-core/core.mjs';

const ID = 'companionk-hammer';

const ability = {
  id: ID,
  name: '夥伴K 鎚子',

  /** 頭巾: 白底藍條紋的帶子, 左側打結, 兩條帶子隨呼吸擺動. */
  hat(k) {
    const { hex, px, group, polygon, smooth, bandPoints, ellipse, fill, stroke, transform, value, track, OUTLINE } = k;
    const line = px(OUTLINE);
    const white = hex('#f7f4ea');
    const blue = hex('#3d8fe3');
    const blueDark = hex('#1f5fa8');
    const top = -0.84;
    const bottom = -0.56;
    const bulge = 0.09;
    const grow = 1.04;
    const edge = (y) => Math.sqrt(Math.max(0.01, 1 - y * y)) * grow;
    const bandY = (y, x) => y + bulge * (1 - (x / edge(y)) ** 2);
    const stripes = Array.from({ length: 9 }, (_, index) => {
      const u0 = -0.92 + index * 0.21;
      const u1 = u0 + 0.1;
      const slant = 0.06;
      const quad = [
        [u0 * edge(top), bandY(top, u0 * edge(top))],
        [u1 * edge(top), bandY(top, u1 * edge(top))],
        [(u1 + slant) * edge(bottom), bandY(bottom, (u1 + slant) * edge(bottom))],
        [(u0 + slant) * edge(bottom), bandY(bottom, (u0 + slant) * edge(bottom))],
      ];
      return group('stripe', [polygon('stripe', quad), fill(blue)]);
    });
    const knot = [-0.98, -0.62];
    const tails = group(
      'tails',
      [
        group('tail a', [smooth('tail a', [[-0.98, -0.66], [-1.25, -0.5], [-1.55, -0.15], [-1.62, 0.12], [-1.44, 0.0], [-1.2, -0.3], [-0.95, -0.52]]), stroke(blueDark, line), fill(blue)]),
        group('tail b', [smooth('tail b', [[-0.98, -0.62], [-1.28, -0.7], [-1.62, -0.55], [-1.85, -0.28], [-1.62, -0.36], [-1.3, -0.5], [-0.98, -0.52]]), stroke(blueDark, line), fill(white)]),
      ],
      transform({ p: value([px(knot[0]), px(knot[1])]), a: value([px(knot[0]), px(knot[1])]), r: track('hatSway') }),
    );
    return [
      group('knot', [ellipse('knot', [px(knot[0]), px(knot[1])], [px(0.26), px(0.26)]), stroke(blueDark, line), fill(blue)]),
      ...stripes,
      group('headband', [polygon('headband', bandPoints(top, bottom, bulge, grow)), stroke(blueDark, line), fill(white)]),
      tails,
    ];
  },

  /** 木桶形的大鎚子: 原點在手, 握柄往上, 桶身橫放在握柄上面. */
  held(k) {
    const { hex, px, group, polygon, smooth, path, ellipse, fill, stroke, transform, track, OUTLINE } = k;
    const line = px(OUTLINE);
    const wood = hex('#e8962e');
    const woodLight = hex('#f6b85c');
    const woodDark = hex('#8a4e12');
    const handle = hex('#b8793a');
    const red = hex('#d8433a');
    const star = hex('#ffd84a');
    const starDark = hex('#e09b00');
    const starPoints = Array.from({ length: 10 }, (_, index) => {
      const radius = index % 2 === 0 ? 0.2 : 0.09;
      const angle = (index * Math.PI) / 5 - Math.PI / 2;
      return [radius * Math.cos(angle), -1.35 + radius * Math.sin(angle)];
    });
    return [
      group(
        'hammer',
        [
          group('emblem', [
            group('star', [polygon('star', starPoints), stroke(starDark, px(0.03)), fill(star)]),
            group('disc', [ellipse('disc', [0, px(-1.35)], [px(0.64), px(0.64)]), stroke(woodDark, px(0.04)), fill(red)]),
          ]),
          group('hoops', [
            path('hoop left', [[px(-0.44), px(-1.78)], [px(-0.5), px(-1.35)], [px(-0.44), px(-0.92)]], { inTangents: [[0, 0], [0, 0], [0, 0]], outTangents: [[0, 0], [0, 0], [0, 0]] }),
            path('hoop right', [[px(0.44), px(-1.78)], [px(0.5), px(-1.35)], [px(0.44), px(-0.92)]]),
            stroke(woodDark, px(0.06)),
          ]),
          group('head', [
            smooth('head', [[-0.72, -1.72], [0, -1.84], [0.72, -1.72], [0.8, -1.35], [0.72, -0.98], [0, -0.86], [-0.72, -0.98], [-0.8, -1.35]]),
            stroke(woodDark, line),
            fill(wood),
          ]),
          group('shine', [smooth('shine', [[-0.6, -1.68], [0, -1.78], [0.6, -1.68], [0.6, -1.55], [0, -1.62], [-0.6, -1.55]]), fill(woodLight, 70)]),
          group('handle', [polygon('handle', [[-0.09, 0.16], [0.09, 0.16], [0.09, -0.92], [-0.09, -0.92]]), stroke(woodDark, line), fill(handle)]),
        ],
        transform({ p: track('hand'), r: track('weaponRot') }),
      ),
    ];
  },

  /** 鎚子向外傾, 左右晃; hover 探出時舉高. 頭巾的帶子隨呼吸擺動. */
  frame({ side, state, values }) {
    const phase = (2 * Math.PI * state.time) / 2.8;
    const sway = state.still ? 0 : Math.sin(phase);
    values.weaponRot = side * (16 - 8 * state.out) + 5 * sway;
    values.hatSway = state.still ? 0 : 8 * Math.sin(phase - 0.9) * (1 - 0.5 * state.out);
  },
};

build(ability, join(dirname(fileURLToPath(import.meta.url)), 'companion'));
