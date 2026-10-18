// 夥伴K 鎚子: 夥伴K 額頭綁著藍白的頭巾 (結在左邊, 兩條帶子垂下來), 手上拿著木桶形的大鎚子 (桶身有一顆星星).
// 身體與動作都與夥伴K相同, 共用 companionk-core/core.mjs; 這裡畫頭巾與鎚子, 以及出場 (跳出來砸地) 與退場 (大迴旋).
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

  /** 砸地的衝擊線: 從鎚子落地的點往上散開的四條短線. */
  outer(k) {
    const { hex, px, group, path, stroke, transform, track } = k;
    const lines = [-160, -125, -55, -20].map((degrees) => {
      const angle = (degrees * Math.PI) / 180;
      return path('impact', [0.35, 0.8].map((radius) => [px(radius * Math.cos(angle)), px(radius * Math.sin(angle))]));
    });
    return [group('impact', [...lines, stroke(hex('#8a4e12'), px(0.09))], transform({ p: track('impactAt'), s: track('impactScale'), o: track('impactOpacity') }))];
  },

  /** 出場: 跳出來, 在空中把鎚子舉到頭後面, 落下時往旁邊砸地, 冒出衝擊線, 身體壓扁, 再把鎚子收回來. */
  enter: {
    seconds: 1.4,
    sample(view, t, k) {
      const { rest, span, lerp, easeIn, easeOut, easeInOut, boing, AWAY } = k;
      const rise = 0.38;
      const land = 0.56;
      // 頭巾的帶子往旁邊伸出約 1.9 (以半徑為 1), 跳的高度加上去要留在畫布 (半寬 3.75) 內.
      const apex = 1.3;
      const state = rest(t - 1.4);
      state.out = 1 - easeInOut(span(t, [0.95, 1.4]));
      state.grip = 1 - easeInOut(span(t, [0.95, 1.3]));
      if (t < rise) {
        Object.assign(state, { inset: lerp(-AWAY, apex, easeOut(t / rise)), squash: [1.12, 0.92], weapon: -70 });
      } else if (t < land) {
        const u = span(t, [rise, land]);
        Object.assign(state, { inset: apex * (1 - u * u), weapon: lerp(-70, 135, easeIn(u)), inhaling: true, squash: [1.15, 0.88] });
      } else {
        Object.assign(state, { weapon: 135, squash: boing(t - land, 0.32), inhaling: t < land + 0.3 });
        state.impact = span(t, [land, land + 0.35]);
      }
      return state;
    },
  },

  /** 退場: 鎚子往後拉蓄力, 原地轉起大迴旋, 越轉越快, 轉著縮回螢幕外. */
  leave: {
    seconds: 1.4,
    sample(view, t, k) {
      const { rest, span, easeIn, easeInOut, AWAY } = k;
      const windup = 0.3;
      const state = rest(t);
      const ready = easeInOut(span(t, [0, windup]));
      Object.assign(state, { out: ready, grip: ready, inhaling: t > 0.15 });
      if (t < windup) {
        const squat = Math.sin(Math.PI * span(t, [0, windup]));
        Object.assign(state, { weapon: -50, squash: [1 - 0.14 * squat, 1 + 0.1 * squat] });
        return state;
      }
      const u = span(t, [windup, 1.4]);
      state.weapon = 90;
      state.open = 0.5;
      state.spin = 1080 * easeIn(u);
      state.inset = t < 0.8 ? 0.5 * Math.sin(Math.PI * span(t, [windup, 0.8])) : -AWAY * easeIn(span(t, [0.8, 1.4]));
      return state;
    },
  },

  /** 鎚子向外傾, 左右晃; hover 探出時舉高. 頭巾的帶子隨呼吸擺動. */
  frame({ side, edge, state, values, kit }) {
    const { R, EDGES, LIMBS } = kit;
    const phase = (2 * Math.PI * state.time) / 2.8;
    const sway = state.still ? 0 : Math.sin(phase);
    values.weaponRot = kit.aim(side * (16 - 8 * state.out) + 5 * sway, side, state);
    values.hatSway = state.still ? 0 : 8 * Math.sin(phase - 0.9) * (1 - 0.5 * state.out);
    // 衝擊線在鎚頭落地的點 (鎚子轉 135 度時, 鎚頭在手的斜下方 0.95, 0.95).
    const impact = state.impact ?? 0;
    const size = 70 + 80 * impact;
    values.impactAt = [side * (LIMBS.arm.x + 0.95) * R, (EDGES[edge].armY + 1.2) * R];
    values.impactScale = [size, size];
    values.impactOpacity = impact > 0 && impact < 1 ? 100 * (1 - impact) : 0;
  },
};

build(ability, join(dirname(fileURLToPath(import.meta.url)), 'companion'));
