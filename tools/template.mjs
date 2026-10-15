// 產生範本夥伴「麻糬」: Lottie JSON, state machine 與 manifest, 寫到工具包的 `mochi/` (或第一個參數的資料夾).
// 產物可以用 Lottie 工具 (例如 Glaxnimate) 開啟編輯, 再以 `uv run tools/companion.py pack` 打包.
// `npm run template` (在工具包的資料夾); 在 stygiomedusa 根目錄是 `pnpm companion:template`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { add, ellipse, fill, group, stroke, transform, value } from './lottie.mjs';
import { gearLayer, gearSlots } from './gear.mjs';

const OUT = process.argv[2] ? resolve(process.argv[2]) : join(dirname(fileURLToPath(import.meta.url)), '..', 'mochi');

/** 夥伴半徑 32, 畫布半邊長 120 (manifest); 畫布座標的中心是螢幕邊緣上的夥伴中心. */
const RADIUS = 32;
const CANVAS = 120;
/** manifest 的 `gear`: 齒輪沿邊離鏈端珠子 150, 點擊半徑 24 (畫出來的底圓也是這個半徑). */
const GEAR = { gap: 150, radius: 24 };
const SIZE = 2 * CANVAS;
const C = CANVAS;
const FR = 30;

const COLORS = {
  body: [1, 0.953, 0.933],
  outline: [0.906, 0.663, 0.706],
  blush: [0.969, 0.714, 0.761],
  eye: [0.231, 0.169, 0.2],
  mouth: [0.557, 0.29, 0.353],
  gear: [0.231, 0.169, 0.2],
};

/** 各邊往螢幕內側的方向; 上緣倒掛 (臉轉 180 度), 其他邊直立. */
const EDGES = {
  right: { dir: [-1, 0], turn: 0 },
  bottom: { dir: [0, -1], turn: 0 },
  left: { dir: [1, 0], turn: 0 },
  top: { dir: [0, 1], turn: 180 },
};
const EDGE_NAMES = Object.keys(EDGES);

/** 每個邊一段時間軸, 段內的區段 (frame, 相對段首). `still` 與 `stillGear` 是減少動態時停住的畫面. */
const SEGMENTS = {
  idle: [0, 59],
  blink: [60, 71],
  duck: [72, 83],
  pop: [84, 101],
  open: [102, 107],
  spit: [108, 125],
  hold: [126, 155],
  gulp: [156, 167],
  still: [168, 169],
  stillGear: [170, 171],
};
const BLOCK = 172;
/** 臉往螢幕內側偏移, 露出的半身才看得到臉; 縮回時整個身體往螢幕外退. */
const FACE_SHIFT = 14;
const DUCK = 14;

const at = (edgeIndex, segment, offset = 0) => edgeIndex * BLOCK + SEGMENTS[segment][0] + offset;
const end = (edgeIndex, segment) => edgeIndex * BLOCK + SEGMENTS[segment][1];

const EASE = { i: { x: [0.5], y: [1] }, o: { x: [0.5], y: [0] } };

/** 由 `[frame, 值]` 組成的 keyframe; 除了最後一個都加上緩動. 前後都是同一個值的 keyframe 是多餘的, 省略. */
function animated(keys) {
  const same = (a, b) => JSON.stringify(a[1]) === JSON.stringify(b[1]);
  const sorted = [...keys]
    .sort((a, b) => a[0] - b[0])
    .filter((key, index, all) => index === 0 || index === all.length - 1 || !same(all[index - 1], key) || !same(key, all[index + 1]));
  return {
    a: 1,
    k: sorted.map(([t, s], index) => (index < sorted.length - 1 ? { t, s: [s].flat(), ...EASE } : { t, s: [s].flat() })),
  };
}

/** 每個邊的每個區段: `values(edge, segment)` 回傳該區段的 `[相對 frame, 值]`; 沒有時頭尾都是 `rest`. */
function timeline(rest, values) {
  const keys = [];
  EDGE_NAMES.forEach((edge, edgeIndex) => {
    for (const segment of Object.keys(SEGMENTS)) {
      const custom = values(edge, segment);
      const restValue = typeof rest === 'function' ? rest(edge) : rest;
      const points = custom ?? [
        [0, restValue],
        [SEGMENTS[segment][1] - SEGMENTS[segment][0], restValue],
      ];
      for (const [offset, v] of points) keys.push([at(edgeIndex, segment, offset), v]);
    }
  });
  return animated(keys);
}


/** 眨眼: 眼睛縱向壓扁再張開. */
const eyeSize = timeline([5, 7], (_, segment) =>
  segment === 'blink' ? [[0, [5, 7]], [5, [5, 1]], [11, [5, 7]]] : null,
);
/** 嘴: 平常是小橫線, 吐出與吸回時張開. */
const OPEN_MOUTH = [9, 9];
const SHUT_MOUTH = [6, 2];
const mouthSize = timeline(SHUT_MOUTH, (_, segment) => {
  if (segment === 'open') return [[0, SHUT_MOUTH], [5, OPEN_MOUTH]];
  if (['spit', 'hold', 'stillGear'].includes(segment)) return [[0, OPEN_MOUTH], [SEGMENTS[segment][1] - SEGMENTS[segment][0], OPEN_MOUTH]];
  if (segment === 'gulp') return [[0, OPEN_MOUTH], [11, SHUT_MOUTH]];
  return null;
});

const face = group(
  'face',
  [
    group('eyes', [ellipse('left eye', [-8, -4], eyeSize), ellipse('right eye', [8, -4], eyeSize), fill(COLORS.eye)]),
    group('blush', [ellipse('left blush', [-14, 4], [7, 4]), ellipse('right blush', [14, 4], [7, 4]), fill(COLORS.blush)]),
    group('mouth', [ellipse('mouth', [0, 7], mouthSize), fill(COLORS.mouth)]),
  ],
  transform({
    p: timeline((edge) => add([C, C], EDGES[edge].dir, FACE_SHIFT), () => null),
    r: timeline((edge) => EDGES[edge].turn, () => null),
  }),
);

/** 縮回時整個麻糬往螢幕外退, 彈出時衝過頭再回來. */
const bodyPosition = timeline([C, C], (edge, segment) => {
  const out = add([C, C], EDGES[edge].dir, -DUCK);
  if (segment === 'duck') return [[0, [C, C]], [11, out]];
  if (segment === 'pop') return [[0, out], [10, add([C, C], EDGES[edge].dir, 4)], [17, [C, C]]];
  return null;
});
/** 呼吸: 沿螢幕內外方向微微伸縮. */
const bodyScale = timeline([100, 100], (edge, segment) => {
  if (segment !== 'idle') return null;
  const deep = EDGES[edge].dir[0] !== 0;
  const breathe = deep ? [104, 98] : [98, 104];
  return [[0, [100, 100]], [30, breathe], [59, [100, 100]]];
});

const mochi = {
  ty: 4,
  nm: 'mochi',
  ind: 2,
  ip: 0,
  op: 4 * BLOCK,
  st: 0,
  sr: 1,
  ks: { a: value([0, 0]), p: value([0, 0]), s: value([100, 100]), r: value(0), o: value(100) },
  shapes: [
    group(
      'mochi',
      [
        face,
        group('body', [ellipse('body', [C, C], [2 * RADIUS, 2 * RADIUS]), stroke(COLORS.outline, 2.5), fill(COLORS.body)]),
      ],
      transform({ p: bodyPosition, a: value([C, C]), s: bodyScale }),
    ),
  ],
};

/** 吐出的齒輪: 位置是 app 寫入的 `gear` slot; 吐出時從 0 長大, 吸回時縮小, 其他區段不畫 (縮放為 0). */
const gearScale = timeline([0, 0], (_, segment) => {
  if (segment === 'spit') return [[0, [0, 0]], [12, [115, 115]], [17, [100, 100]]];
  if (segment === 'hold' || segment === 'stillGear') return [[0, [100, 100]], [SEGMENTS[segment][1] - SEGMENTS[segment][0], [100, 100]]];
  if (segment === 'gulp') return [[0, [100, 100]], [11, [0, 0]]];
  return null;
});
const gearSpin = timeline(0, (_, segment) => (segment === 'hold' ? [[0, 0], [15, 12], [29, 0]] : null));
const GEAR_REST = [200, 40];

/** 預設齒輪 (`gear.mjs`): 與史萊姆的齒輪相同的比例; 底圓用麻糬的顏色與外框. */
const gear = gearLayer({
  radius: GEAR.radius,
  colors: { ink: COLORS.gear, disc: COLORS.body, outline: COLORS.outline },
  ind: 1,
  op: 4 * BLOCK,
  scale: gearScale,
  rotation: gearSpin,
  rest: GEAR_REST,
});

const markers = EDGE_NAMES.flatMap((edge, edgeIndex) =>
  Object.keys(SEGMENTS).map((segment) => ({ cm: `${segment}-${edge}`, tm: at(edgeIndex, segment), dr: end(edgeIndex, segment) - at(edgeIndex, segment) })),
);

const animation = {
  v: '5.12.0',
  fr: FR,
  ip: 0,
  op: 4 * BLOCK,
  w: SIZE,
  h: SIZE,
  nm: '麻糬',
  ddd: 0,
  assets: [],
  markers,
  slots: gearSlots(GEAR_REST),
  layers: [gear, mochi],
};

// --- state machine (design D7): 各邊一組 state, 名稱為 `<區段>-<邊>`. ---

const guard = (type, inputName, conditionType, compareTo) => ({ type, inputName, conditionType, compareTo });
const to = (toState, ...guards) => ({ type: 'Transition', toState, guards });
const set = (inputName, number) => ({ type: 'SetNumeric', inputName, value: number });
const hovering = (on) => guard('Boolean', 'hovering', 'Equal', on);
const reduced = (on) => guard('Boolean', 'reducedMotion', 'Equal', on);
const step = guard('Numeric', 'step', 'Equal', 1);
const budAtLeast = guard('Numeric', 'bud', 'GreaterThanOrEqual', 0.2);
const budBelow = guard('Numeric', 'bud', 'LessThan', 0.2);

function playback(segment, edge, { loop = false, autoplay = true, transitions = [], entry = [] } = {}) {
  return {
    name: `${segment}-${edge}`,
    type: 'PlaybackState',
    animation: 'mochi',
    segment: `${segment}-${edge}`,
    loop,
    autoplay,
    // `step` 由 OnComplete 設為 1, 表示這個區段播完; 每個 state 進入時歸零.
    entryActions: [set('step', 0), ...entry],
    transitions,
  };
}

/** 換邊: 停著的 state 依新的 `edge` 換成那一邊的同一種 state. */
const moveEdge = (edge, segment) =>
  EDGE_NAMES.filter((other) => other !== edge).map((other) => to(`${segment}-${other}`, guard('String', 'edge', 'Equal', other)));

const states = EDGE_NAMES.flatMap((edge) => [
  // 閒置: 每播完一輪抽一次 `roll`, 小於 0.2 眨眼, 0.2 到 0.35 縮回再彈出 (觸發柔軟身體).
  playback('idle', edge, {
    loop: true,
    transitions: [
      to(`still-${edge}`, reduced(true)),
      to(`open-${edge}`, hovering(true)),
      ...moveEdge(edge, 'idle'),
      to(`blink-${edge}`, guard('Numeric', 'roll', 'LessThan', 0.2)),
      to(`duck-${edge}`, guard('Numeric', 'roll', 'LessThan', 0.35)),
    ],
  }),
  playback('blink', edge, {
    entry: [set('roll', 1)],
    transitions: [to(`open-${edge}`, hovering(true)), ...moveEdge(edge, 'idle'), to(`idle-${edge}`, step)],
  }),
  playback('duck', edge, {
    entry: [set('roll', 1)],
    transitions: [to(`open-${edge}`, hovering(true)), ...moveEdge(edge, 'idle'), to(`pop-${edge}`, step)],
  }),
  playback('pop', edge, {
    transitions: [to(`open-${edge}`, hovering(true)), ...moveEdge(edge, 'idle'), to(`idle-${edge}`, step)],
  }),
  // hover: 張嘴; 探出完成 (`bud` ≥ 0.2) 後才吐出齒輪 (design D2, D7).
  playback('open', edge, {
    transitions: [to(`still-${edge}`, reduced(true)), to(`idle-${edge}`, hovering(false)), to(`spit-${edge}`, budAtLeast)],
  }),
  playback('spit', edge, {
    transitions: [to(`still-${edge}`, reduced(true)), to(`gulp-${edge}`, hovering(false)), to(`hold-${edge}`, step)],
  }),
  playback('hold', edge, {
    loop: true,
    transitions: [to(`still-${edge}`, reduced(true)), to(`gulp-${edge}`, hovering(false))],
  }),
  // 吸回: 齒輪縮小; `bud` 回到 0.2 以下時回到閒置, 齒輪一定在探出縮回前消失.
  playback('gulp', edge, {
    transitions: [to(`still-${edge}`, reduced(true)), to(`spit-${edge}`, hovering(true), budAtLeast), to(`idle-${edge}`, budBelow)],
  }),
  // 減少動態: 停在不播放的畫面; hover 且探出完成時顯示齒輪.
  playback('still', edge, {
    autoplay: false,
    transitions: [
      to(`idle-${edge}`, reduced(false)),
      ...moveEdge(edge, 'still'),
      to(`stillGear-${edge}`, hovering(true), budAtLeast),
    ],
  }),
  playback('stillGear', edge, {
    autoplay: false,
    transitions: [to(`idle-${edge}`, reduced(false)), to(`still-${edge}`, budBelow)],
  }),
]);

const interactions = EDGE_NAMES.flatMap((edge) => [
  { type: 'OnLoopComplete', stateName: `idle-${edge}`, actions: [{ type: 'SetRandom', inputName: 'roll', min: 0, max: 1 }] },
  ...['blink', 'duck', 'pop', 'spit'].map((segment) => ({
    type: 'OnComplete',
    stateName: `${segment}-${edge}`,
    actions: [set('step', 1)],
  })),
]);

const stateMachine = {
  initial: 'idle-right',
  inputs: [
    { type: 'String', name: 'edge', value: 'right' },
    // 麻糬沿邊左右對稱, 齒輪位置由 `gear` slot 決定, 所以宣告但不依 `along` 分支.
    { type: 'String', name: 'along', value: 'up' },
    { type: 'Boolean', name: 'hovering', value: false },
    { type: 'Boolean', name: 'dragging', value: false },
    { type: 'Numeric', name: 'bud', value: 0 },
    { type: 'Boolean', name: 'reducedMotion', value: false },
    // 範本自己的 input: 閒置動作的亂數與區段播完的旗標.
    { type: 'Numeric', name: 'roll', value: 1 },
    { type: 'Numeric', name: 'step', value: 0 },
  ],
  interactions,
  states,
};

const manifest = {
  format: 1,
  id: 'mochi',
  name: '麻糬',
  author: 'Stygiomedusa',
  radius: RADIUS,
  canvas: CANVAS,
  gap: 75,
  lean: 0.8,
  gear: GEAR,
  jiggle: { stiffness: 260, damping: 7, thin: 0.5, appear: 2.8, hide: -1.8, spit: -2.6, gulp: 2.2 },
  kicks: Object.fromEntries(EDGE_NAMES.flatMap((edge) => [[`duck-${edge}`, -1.8], [`pop-${edge}`, 2.8]])),
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'animation.json'), `${JSON.stringify(animation, null, 2)}\n`);
writeFileSync(join(OUT, 'state-machine.json'), `${JSON.stringify(stateMachine, null, 2)}\n`);
writeFileSync(join(OUT, 'companion.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${OUT}`);
