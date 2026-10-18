// 夥伴K 雨傘: 夥伴K 手上撐著紅白相間的雨傘 (傘尖有一顆金色的小星星). 這個能力沒有帽子.
// 身體與動作都與夥伴K相同, 共用 companionk-core/core.mjs; 這裡畫雨傘, 以及出場 (撐傘飄下來) 與退場 (被風吹走).
// 產物寫到 ./companion/, 再於 repo 的根目錄以
// `npm run pack -- companionk-parasol/companion companionk-parasol/companionk-parasol.companion` 打包.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../companionk-core/core.mjs';

const ID = 'companionk-parasol';

const PANELS = 6;
const WIDTH = 1.15; // 傘的半徑 (以夥伴半徑為 1)
const HEIGHT = 0.8; // 傘面隆起的高度
const DEPTH = 0.2; // 傘緣的橢圓 (從上面稍微往下看) 的半高
const BASE = -1.15; // 傘緣中心離手的高度

/** 傘面上的點: `polar` 從傘尖 (0) 到傘緣 (90 度), `azimuth` 從左 (-90 度) 到右 (90 度). */
function dome(polar, azimuth, scallop = 0) {
  const p = (polar * Math.PI) / 180;
  const a = (azimuth * Math.PI) / 180;
  return [WIDTH * Math.sin(p) * Math.sin(a), BASE - HEIGHT * Math.cos(p) + DEPTH * Math.sin(p) * Math.cos(a) + scallop];
}

const ability = {
  id: ID,
  name: '夥伴K 雨傘',

  /** 雨傘: 原點在手, 傘柄往上, 傘面是 6 片紅白相間的扇形. */
  held(k) {
    const { hex, px, group, polygon, path, ellipse, fill, stroke, transform, track, OUTLINE } = k;
    const line = px(OUTLINE);
    const red = hex('#e5384a');
    const white = hex('#ffffff');
    const edge = hex('#8f1f2e');
    const shaft = hex('#e8b923');
    const shaftDark = hex('#a97c00');
    const star = hex('#ffd84a');
    const starDark = hex('#e09b00');
    const panels = Array.from({ length: PANELS }, (_, index) => {
      const from = -90 + (180 * index) / PANELS;
      const to = -90 + (180 * (index + 1)) / PANELS;
      const rib = (azimuth) => Array.from({ length: 9 }, (_, step) => dome((90 * step) / 8, azimuth));
      const rim = Array.from({ length: 7 }, (_, step) => {
        const fraction = step / 6;
        return dome(90, from + (to - from) * fraction, 0.09 * Math.sin(Math.PI * fraction));
      });
      return group(`panel ${index}`, [polygon('panel', [...rib(from), ...rim, ...rib(to).reverse()]), stroke(edge, line * 0.8), fill(index % 2 === 0 ? red : white)]);
    });
    const finial = Array.from({ length: 10 }, (_, index) => {
      const radius = index % 2 === 0 ? 0.17 : 0.07;
      const angle = (index * Math.PI) / 5 - Math.PI / 2;
      return [radius * Math.cos(angle), BASE - HEIGHT - 0.1 + radius * Math.sin(angle)];
    });
    return [
      group(
        'parasol',
        [
          group('finial', [polygon('finial', finial), stroke(starDark, px(0.04)), fill(star)]),
          group('canopy', panels),
          group('shaft', [path('shaft', [[0, px(BASE)], [0, px(0.28)], [px(-0.16), px(0.4)], [px(-0.3), px(0.3)]]), stroke(shaft, px(0.09)), stroke(shaftDark, px(0.15))]),
        ],
        transform({ p: track('hand'), r: track('weaponRot') }),
      ),
    ];
  },

  /**
   * 出場: 從邊冒出來, 舉高撐開的傘, 左右搖擺慢慢飄下來落地. 上下緣往上是螢幕內側;
   * 左右邊先冒出在上面一點, 再沿著邊往下飄.
   */
  enter: {
    seconds: 1.4,
    sample(view, t, k) {
      const { rest, span, lerp, easeOut, easeInOut, boing, EDGES, AWAY } = k;
      const pop = 0.3;
      const land = 1.1;
      // 傘頂離中心約 2.7 (以半徑為 1), 飄的高度加上去要留在畫布 (半寬 3.75) 內.
      const HEIGHT = 1.0;
      const wall = EDGES[view.edge].dir[0] !== 0;
      const state = rest(t - 1.4);
      const up = easeOut(span(t, [0, pop]));
      const drift = easeInOut(span(t, [pop, land]));
      const height = HEIGHT * (1 - drift);
      const sway = t < pop ? 0 : Math.sin((2 * Math.PI * (t - pop)) / 0.8) * (1 - drift);
      if (wall) Object.assign(state, { inset: t < pop ? lerp(-AWAY, 0.45, up) : 0.45 * (1 - drift) + 0.15 * sway, slide: height });
      else Object.assign(state, { inset: t < pop ? lerp(-AWAY, HEIGHT, up) : height, slide: 0.35 * sway });
      const settle = easeInOut(span(t, [land, 1.4]));
      state.spin = 10 * sway;
      state.grip = 1 - settle;
      state.weapon = 4 * sway;
      state.raise = 0.7 * (1 - settle);
      state.out = 1 - settle;
      state.squash = boing(t - land, 0.15);
      return state;
    },
  },

  /** 退場: 舉起傘, 一陣風把傘吹起來, 夥伴K被帶著搖搖晃晃地飛遠 (越來越小). */
  leave: {
    seconds: 1.6,
    sample(view, t, k) {
      const { rest, span, easeIn, easeInOut, EDGES, AWAY } = k;
      const gust = 0.3;
      const wall = EDGES[view.edge].dir[0] !== 0;
      const state = rest(t);
      const hold = easeInOut(span(t, [0, gust]));
      const u = span(t, [gust, 1.6]);
      const height = 2.6 * u * u;
      const sway = t < gust ? 0 : Math.sin((2 * Math.PI * (t - gust)) / 0.8) * (0.3 + u);
      const squat = Math.sin(Math.PI * span(t, [0, gust + 0.05]));
      if (wall) Object.assign(state, { slide: height, inset: 0.3 * sway - AWAY * easeIn(span(t, [0.8, 1.6])) });
      else Object.assign(state, { inset: height, slide: 0.5 * sway + 1.2 * u * u });
      Object.assign(state, { grip: hold, weapon: 4 * sway, raise: hold, out: hold, spin: 14 * sway });
      state.squash = [1 - 0.12 * squat, 1 + 0.08 * squat];
      state.size = 1 - easeIn(span(t, [0.7, 1.6]));
      return state;
    },
  },

  /** 傘微微搖晃, 向外傾; hover 探出時撐正. 傘面輕輕轉動 (左右縮放). */
  frame({ side, state, values, kit }) {
    const phase = (2 * Math.PI * state.time) / 2.8;
    const sway = state.still ? 0 : Math.sin(phase);
    values.weaponRot = kit.aim(side * (24 - 10 * state.out) + 4 * sway, side, state);
  },
};

build(ability, join(dirname(fileURLToPath(import.meta.url)), 'companion'));
