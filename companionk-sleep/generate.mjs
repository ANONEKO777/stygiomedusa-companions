// 夥伴K 睡眠: 夥伴K 戴著藍綠色圓點的睡帽 (奶黃色帽緣與絨球), 閒置時側躺睡覺 (原圖的姿勢): 長長的身體橫躺,
// 臉 (閉著眼) 在頭那一端, 睡帽蓋在背上, 紅色的腳從身體的另一端露出來, 小手放在臉的前面; 旁邊冒出一串泡泡,
// 偶爾脹出一顆鼻涕泡. hover 時醒來站起來, 張嘴吐出星星變齒輪; 離開後吞回齒輪, 再睡著.
// 出場趴著滑進來打個哈欠; 退場沉回螢幕外, 留下往上飄的「Z」.
// 身體的壓扁與各部位的位置由這裡的 frame 算, 核心 (companionk-core/core.mjs) 只提供各部位的 track.
// 產物寫到 ./companion/, 再於 repo 的根目錄以
// `npm run pack -- companionk-sleep/companion companionk-sleep/companionk-sleep.companion` 打包.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../companionk-core/core.mjs';

const ID = 'companionk-sleep';
/** 往螢幕內側飄的泡泡: 大小 (半徑, 以夥伴半徑為 1) 與錯開的相位. */
const BUBBLES = [
  { phase: 0, size: 0.14 },
  { phase: 1 / 3, size: 0.2 },
  { phase: 2 / 3, size: 0.28 },
];
/** 側躺的各部位 (以夥伴半徑為 1; x 以頭的方向為正, y 往下為正; 原點是身體中心). */
const LYING = {
  face: [0.55, 0], // 臉的中心
  faceScale: 0.88,
  hand: [0.05, 0.5], // 放在臉前面的小手
  feet: { '-1': [-1.22, 0.22], '1': [-1.05, 0.46] }, // 兩隻腳從身體後端露出來
  /** 睡帽蓋在頭與背上: 縮放 (拉寬壓低), 帽子原點 (往頭的方向偏多少, 往下偏多少), 往腳的方向歪的角度, 絨球的位置 (躺下時掛在帽緣的末端). */
  hat: { scale: [1.25, 0.85], origin: [-0.1, 0.05], rotation: 10, pompom: [-1.2, -0.25] },
  /** 身體離邊緣多遠 (往螢幕內側): 左右邊要退進來才看得到整個身體; 上下緣躺在邊上, 只要稍微往頭的方向. */
  inset: { wall: 1.25, floor: 0.25 },
};
/** 退場時的「Z」: 每個出現的時間 (秒). */
const ZZZ = [0, 0.3, 0.6];

const ability = {
  id: ID,
  name: '夥伴K 睡眠',
  sleep: true,
  held: () => [], // 只借用核心的「前面的手」: 躺下時畫在臉的前面, 醒來時換回原本在身體後面的手

  /** 睡帽: 圓頂有奶黃色的圓點, 奶黃色的帽緣, 醒來時帽尾往旁邊垂 (躺下時帽尾收起來, 絨球改掛在帽緣的末端). */
  hat(k) {
    const { hex, px, group, polygon, domePoints, bandPoints, ellipse, fill, stroke, transform, value, track, OUTLINE } = k;
    const line = px(OUTLINE);
    const teal = hex('#3ba7a3');
    const tealDark = hex('#1f6f6c');
    const cream = hex('#f6e9a8');
    const creamDark = hex('#c8b25a');
    const pivot = [0, -1.38];
    const dots = [[-0.46, -0.86, 0.13], [0.05, -1.02, 0.15], [0.52, -0.84, 0.12], [-0.12, -0.74, 0.09]];
    const tail = group('tail', [
      group('pompom', [ellipse('pompom', [0, px(-1.9)], [px(0.56), px(0.56)]), stroke(creamDark, line), fill(cream)]),
      group('tail', [polygon('tail', [[-0.26, -1.25], [-0.14, -1.55], [-0.1, -1.78], [0.1, -1.78], [0.14, -1.55], [0.26, -1.25]]), stroke(tealDark, line), fill(teal)]),
    ], transform({ p: value([px(pivot[0]), px(pivot[1])]), a: value([px(pivot[0]), px(pivot[1])]), r: track('hatSway'), o: track('tailOpacity') }));
    return [
      group('band', [polygon('band', bandPoints(-0.74, -0.5, 0.08, 1.06)), stroke(creamDark, line), fill(cream)]),
      group('dots', dots.map(([x, y, r]) => group('dot', [ellipse('dot', [px(x), px(y)], [px(2 * r), px(2 * r)]), fill(cream)]))),
      group('dome', [polygon('dome', domePoints(-0.5, 1.09, -0.02, 24).map(([x, y]) => [x, y < -0.5 ? -0.5 + (y + 0.5) * 1.5 : y])), stroke(tealDark, line), fill(teal)]),
      tail,
    ];
  },

  /** 躺下時掛在帽緣末端的絨球 (畫在身體外面, 不跟著壓扁). */
  outer(k) {
    const { hex, px, group, ellipse, fill, stroke, transform, track, OUTLINE } = k;
    return [
      group('lying pompom', [ellipse('pompom', [0, 0], [px(0.6), px(0.6)]), stroke(hex('#c8b25a'), px(OUTLINE)), fill(hex('#f6e9a8'))], transform({ p: track('pompomPosition'), o: track('pompomOpacity') })),
    ];
  },

  /** 泡泡與鼻涕泡的圖層 (畫布座標, 不跟著身體變形). */
  layers(k) {
    const { hex, px, group, path, ellipse, fill, stroke, transform, layer, track, OUTLINE } = k;
    const cyan = hex('#46bfc9');
    const cyanLight = hex('#cdf3f6');
    const white = hex('#ffffff');
    const bubble = (name, position, scale, opacity) =>
      group(name, [
        group('shine', [ellipse('shine', [px(-0.12), px(-0.13)], [px(0.16), px(0.1)]), fill(white)]),
        group('bubble', [ellipse('bubble', [0, 0], [px(0.64), px(0.64)]), stroke(cyan, px(OUTLINE * 0.9)), fill(cyanLight, 55)]),
      ], transform({ p: position, s: scale, o: opacity }));
    return [
      layer('bubbles', 10, [
        // 鼻涕泡改變的是圓的大小 (不是縮放), 外框的粗細才不會跟著變.
        group('snore', [
          group('bubble', [ellipse('bubble', [0, 0], track('snoreSize')), stroke(cyan, px(OUTLINE * 0.9)), fill(cyanLight, 55)]),
        ], transform({ p: track('snorePosition'), o: track('snoreOpacity') })),
        ...BUBBLES.map((item, index) => bubble(`bubble ${index}`, track(`bubble${index}Position`), track(`bubble${index}Scale`), track(`bubble${index}Opacity`))),
      ]),
      // 退場時往上飄的「Z」: 畫布座標, 字一直是正的.
      layer('zzz', 11, Array.from({ length: ZZZ.length }, (_, index) =>
        group(`z ${index}`, [
          path('z', [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].map(([x, y]) => [px(x), px(y)])),
          stroke(hex('#1f6f6c'), px(0.09)),
        ], transform({ p: track(`z${index}Position`), s: track(`z${index}Scale`), o: track(`z${index}Opacity`) })),
      )),
    ];
  },

  /** 出場: 趴著睡覺, 從邊慢慢滑進來, 停下後打一個大哈欠 (嘴巴張大, 身體伸長), 再繼續睡. */
  enter: {
    seconds: 1.4,
    sample(view, t, k) {
      const { rest, span, lerp, easeOut, AWAY, LOOP } = k;
      // 呼吸與泡泡的時鐘在出場結束時接上閒置 (加一輪 LOOP, 時鐘不會是負的).
      const state = rest(t - 1.4 + LOOP);
      state.inset = lerp(-AWAY, 0, easeOut(span(t, [0, 0.7])));
      const yawn = Math.sin(Math.PI * span(t, [0.7, 1.35]));
      state.yawn = yawn;
      state.squash = [1 + 0.1 * yawn, 1 - 0.04 * yawn];
      state.bubbles = span(t, [0.6, 1.0]);
      return state;
    },
  },

  /** 退場: 睡得更沉, 慢慢沉回螢幕外, 留下一串往上飄的「Z」. 含著齒輪時先吞回去, 吞完就趴下. */
  leave: {
    seconds: 1.8,
    sample(view, t, k) {
      const { rest, span, easeIn, AWAY } = k;
      const state = rest(t);
      state.inset = -AWAY * easeIn(span(t, [0.2, 1.6]));
      state.bubbles = 1 - span(t, [0, 0.4]);
      state.zzz = ZZZ.map((spawn) => span(t, [spawn, spawn + 1.1]));
      return state;
    },
  },

  frame({ view, edge, name, state, shape, values, kit }) {
    const { R, EDGES, add, toCanvas, lerp, clamp01 } = kit;
    const lie = state.sleep;
    const { sx, sy } = shape;
    const inward = EDGES[edge].dir;
    const across = [-inward[1], inward[0]];
    // 頭朝哪邊: 左右邊朝螢幕內側; 上下緣朝 `along` (往螢幕中間). 倒掛的上緣, 夥伴的座標 x 與畫面相反.
    const screenHead = view.edge === 'right' ? -1 : view.edge === 'left' ? 1 : view.along === 'left' ? -1 : 1;
    const head = EDGES[edge].turn === 180 ? -screenHead : screenHead;
    const wall = view.edge === 'left' || view.edge === 'right';
    // 世界座標 (以夥伴半徑為 1, 原點在身體中心) 換成身體的座標 (身體被壓扁, 要除掉).
    const toBody = ([x, y]) => [x / sx, y / sy];
    const mix = (from, to) => from.map((value, index) => lerp(value, to[index], lie));

    // 身體: 上下緣躺在邊上 (底部貼著邊), 左右邊往螢幕內側退.
    const body = [head * (wall ? LYING.inset.wall : LYING.inset.floor) * lie, wall ? 0 : -sy * lie];
    values.bodyShift = [body[0] * R, body[1] * R];

    // 臉: 在頭那一端, 不跟著身體壓扁.
    const faceScale = lerp(1, LYING.faceScale, lie);
    const faceAt = [head * LYING.face[0] * lie, LYING.face[1] * lie];
    const faceBody = toBody(faceAt);
    values.faceShift = [faceBody[0] * R, faceBody[1] * R];
    values.faceScale = [lerp(100, (100 * faceScale) / sx, lie), lerp(100, (100 * faceScale) / sy, lie)];

    // 帽子: 畫在身體外面 (不跟著壓扁); 醒來時與身體相同, 躺下時斜著蓋在頭上與背上, 帽頂朝腳的方向.
    const hatAt = [body[0] + head * LYING.hat.origin[0], body[1] + LYING.hat.origin[1]];
    values.hatShift = [lerp(values.bodyShift[0], hatAt[0] * R, lie), lerp(values.bodyShift[1], hatAt[1] * R, lie)];
    values.hatScale = [lerp(values.scale[0], 100 * LYING.hat.scale[0], lie), lerp(values.scale[1], 100 * LYING.hat.scale[1], lie)];
    values.tailOpacity = 100 * (1 - clamp01(lie * 2));
    values.pompomOpacity = 100 * clamp01((lie - 0.5) * 2);
    values.pompomPosition = [(body[0] + head * LYING.hat.pompom[0]) * R, (body[1] + LYING.hat.pompom[1]) * R];
    values.hatRot = -head * LYING.hat.rotation * lie;
    // 醒來時帽尾往旁邊垂 (隨呼吸擺動); 躺下時順著身體.
    const phase = (2 * Math.PI * state.time) / 2.8;
    const droop = 105 * (1 - lie);
    values.hatSway = state.still ? droop : droop + 5 * Math.sin(phase - 0.9);

    // 手: 躺下時放在臉的前面 (畫在身體前面); 醒來時換回原本在身體後面的手.
    const standHand = [values.hand[0] / R, values.hand[1] / R];
    const hand = mix(standHand, toBody([head * LYING.hand[0], LYING.hand[1]]));
    values.hand = [hand[0] * R, hand[1] * R];
    values.handScale = [lerp(100, 100 / sx, lie), lerp(100, 100 / sy, lie)];
    values.handOpacity = 100 * clamp01((lie - 0.5) * 2);
    const hidden = [0.15, 0.05];
    values.armLeft = mix([values.armLeft[0] / R, values.armLeft[1] / R], [-hidden[0], hidden[1]]).map((number) => number * R);
    values.armRight = mix([values.armRight[0] / R, values.armRight[1] / R], [hidden[0], hidden[1]]).map((number) => number * R);

    // 腳: 躺下時兩隻腳從身體後端露出來, 不跟著身體壓扁.
    for (const sign of [-1, 1]) {
      const [x, y] = LYING.feet[sign];
      values[`foot${sign}Position`] = mix([sign * 0.42, 0.84], toBody([head * x, y])).map((number) => number * R);
      values[`foot${sign}Scale`] = [lerp(100, 100 / sx, lie), lerp(100, 100 / sy, lie)];
      values[`foot${sign}Rotation`] = sign * 18 * (1 - lie);
    }

    // 泡泡一輪 2.8 秒, 三顆錯開, 從臉往螢幕內側飄; 醒來時淡出.
    const faceLocal = [body[0] + faceAt[0], body[1] + faceAt[1]];
    BUBBLES.forEach((item, index) => {
      const progress = state.still ? 0 : (state.time / 2.8 + item.phase) % 1;
      const wobble = Math.sin(progress * Math.PI * 2 + index) * 0.22;
      const origin = add(toCanvas(edge, [faceLocal[0], faceLocal[1] - 0.2], state.inset), inward, R * (0.45 + 1.9 * progress));
      values[`bubble${index}Position`] = add(origin, across, R * wobble);
      const scale = ((100 * item.size) / 0.32) * (0.5 + 0.9 * progress);
      values[`bubble${index}Scale`] = [scale, scale];
      values[`bubble${index}Opacity`] = state.still ? 0 : 85 * Math.sin(Math.PI * progress) * state.sleep * (state.bubbles ?? 1);
    });
    // 哈欠: 嘴巴張大.
    const yawn = state.yawn ?? 0;
    values.mouthSize = values.mouthSize.map((size) => size * (1 + 1.6 * yawn));
    // 「Z」從臉 (沉下去之前的位置) 往螢幕內側飄, 左右搖, 越飄越大, 再淡出.
    ZZZ.forEach((_, index) => {
      const progress = state.zzz?.[index] ?? 0;
      const origin = add(toCanvas(edge, [faceLocal[0], faceLocal[1] - 0.2], 0), inward, R * (0.2 + 1.0 * progress));
      values[`z${index}Position`] = add(origin, across, R * 0.35 * Math.sin(progress * Math.PI * 2 + index));
      const scale = 80 + 70 * progress + 20 * index;
      values[`z${index}Scale`] = [scale, scale];
      values[`z${index}Opacity`] = progress > 0 && progress < 1 ? 100 * Math.sin(Math.PI * progress) : 0;
    });
    // 鼻涕泡: 從嘴脹大, 脹到最大時破掉.
    const mouth = toCanvas(edge, [faceLocal[0], faceLocal[1] + 0.21 * faceScale], state.inset);
    const diameter = R * (0.12 + 1.1 * state.snore);
    values.snorePosition = add(mouth, inward, diameter / 2);
    values.snoreSize = [diameter, diameter];
    values.snoreOpacity = name === 'snore' && state.snore > 0 && state.snore < 0.999 ? 85 : 0;
  },
};

build(ability, join(dirname(fileURLToPath(import.meta.url)), 'companion'));
