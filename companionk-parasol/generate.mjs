// 夥伴K 雨傘: 夥伴K 手上撐著紅白相間的雨傘 (傘尖有一顆金色的小星星). 這個能力沒有帽子.
// 身體與動作都與夥伴K相同, 共用 companionk-core/core.mjs; 這裡只畫雨傘.
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

  /** 傘微微搖晃, 向外傾; hover 探出時撐正. 傘面輕輕轉動 (左右縮放). */
  frame({ side, state, values }) {
    const phase = (2 * Math.PI * state.time) / 2.8;
    const sway = state.still ? 0 : Math.sin(phase);
    values.weaponRot = side * (24 - 10 * state.out) + 4 * sway;
  },
};

build(ability, join(dirname(fileURLToPath(import.meta.url)), 'companion'));
