// 產生夥伴「小水獺」: Lottie JSON, state machine 與 manifest, 寫到 `otter/companion/`.
// 從正上方看, 胖胖的 Q 版小水獺在水裡抱著貝殼玩.
// 左, 右, 下緣: 仰躺在水池中. 上緣: 從貼著上緣的水面探出頭和雙手, 身體在水下.
// hover 時把貝殼丟出去, 貝殼飛到齒輪的位置變成齒輪, 離開時再飛回手中.
// 從 `tools/template.mjs` 修改: 貝殼的飛行路徑與頭的方向依姿勢而不同, 所以時間軸依 `<edge>-<along>` 分成 6 段.
// `node otter/generate.mjs` (在工具包的根目錄).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { add, fill, group, stroke, transform, value } from '../tools/lottie.mjs';
import { gearShapes, gearSlots, GEAR_SLOT } from '../tools/gear.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'companion');

/** 夥伴半徑 32, 畫布半邊長 120 (manifest); 畫布座標的中心是螢幕邊緣上的夥伴中心. */
const RADIUS = 32;
const CANVAS = 120;
const GAP = 75;
const LEAN = 0.8;
const BEAD_RADIUS = 42;
/** manifest 的 `gear`: 齒輪沿邊離鏈端珠子 150, 點擊半徑 24 (畫出來的底圓也是這個半徑). */
const GEAR = { gap: 150, radius: 24 };
const SIZE = 2 * CANVAS;
const C = CANVAS;
const FR = 30;

const COLORS = {
  line: [0.3, 0.2, 0.14],
  fur: [0.52, 0.36, 0.26],
  belly: [0.64, 0.48, 0.36],
  face: [0.98, 0.93, 0.84],
  paw: [0.42, 0.29, 0.21],
  pad: [0.3, 0.2, 0.14],
  nose: [0.2, 0.13, 0.1],
  eye: [0.13, 0.09, 0.07],
  shine: [1, 1, 1],
  mouth: [0.6, 0.27, 0.27],
  blush: [0.98, 0.64, 0.64],
  whisker: [0.55, 0.45, 0.38],
  water: [0.67, 0.87, 0.97],
  waterRim: [0.47, 0.75, 0.93],
  ripple: [1, 1, 1],
  shell: [1, 0.9, 0.84],
  shellLine: [0.86, 0.56, 0.52],
};

/**
 * 姿勢: 每個邊與方向 (`<edge>-<along>`) 一組. `dir` 是往螢幕內側, `way` 是從珠子往夥伴 (再往齒輪) 的方向.
 * 左, 右, 下緣 (橫躺): 本地座標從正上方看, 仰躺, 頭在 -x, 身體的中線在 y = -14; 依 `flip` 左右鏡像.
 * 左右邊頭朝螢幕內側, 下緣頭朝齒輪. 上緣 (`peek`): 從貼著上緣的水面探出頭; 座標就是畫布座標.
 */
const POSES = {
  'right-up': { edge: 'right', along: 'up', dir: [-1, 0], way: [0, -1], flip: 1, peek: false },
  'left-up': { edge: 'left', along: 'up', dir: [1, 0], way: [0, -1], flip: -1, peek: false },
  'bottom-left': { edge: 'bottom', along: 'left', dir: [0, -1], way: [-1, 0], flip: 1, peek: false },
  'bottom-right': { edge: 'bottom', along: 'right', dir: [0, -1], way: [1, 0], flip: -1, peek: false },
  'top-right': { edge: 'top', along: 'right', dir: [0, 1], way: [1, 0], flip: 1, peek: true },
  'top-left': { edge: 'top', along: 'left', dir: [0, 1], way: [-1, 0], flip: 1, peek: true },
};
const POSE_NAMES = Object.keys(POSES);

/** 本地的點換成畫布座標 (相對畫布中心); 畫布上的方向換成本地的方向. 兩者都只差左右鏡像. */
const toCanvas = (pose, [x, y]) => [x * pose.flip, y];
const toLocalVec = (pose, [x, y]) => [x * pose.flip, y];

/** 每個姿勢一段時間軸, 段內的區段 (frame, 相對段首). `still` 與 `stillGear` 是減少動態時停住的畫面. */
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
const TOTAL_FRAMES = POSE_NAMES.length * BLOCK;
/** 潛水時整組往螢幕外退. */
const DUCK = 30;

const at = (poseIndex, segment, offset = 0) => poseIndex * BLOCK + SEGMENTS[segment][0] + offset;
const end = (poseIndex, segment) => poseIndex * BLOCK + SEGMENTS[segment][1];
const length = (segment) => SEGMENTS[segment][1] - SEGMENTS[segment][0];

const EASE = { i: { x: [0.5], y: [1] }, o: { x: [0.5], y: [0] } };
const LINEAR = { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } };

/**
 * 由 `[frame, 值, 'linear'?]` 組成的 keyframe; 除了最後一個都加上緩動 (標記 `'linear'` 的用線性).
 * 前後都是同一個值的 keyframe 是多餘的, 省略.
 */
function animated(keys) {
  const same = (a, b) => JSON.stringify(a[1]) === JSON.stringify(b[1]);
  const sorted = [...keys]
    .sort((a, b) => a[0] - b[0])
    .filter((key, index, all) => index === 0 || index === all.length - 1 || !same(all[index - 1], key) || !same(key, all[index + 1]));
  return {
    a: 1,
    k: sorted.map(([t, s, ease], index) =>
      index < sorted.length - 1 ? { t, s: [s].flat(), ...(ease === 'linear' ? LINEAR : EASE) } : { t, s: [s].flat() },
    ),
  };
}

/** 每個姿勢的每個區段: `values(pose, segment)` 回傳該區段的 `[相對 frame, 值]`; 沒有時頭尾都是 `rest`. */
function timeline(rest, values) {
  const keys = [];
  POSE_NAMES.forEach((name, poseIndex) => {
    const pose = POSES[name];
    for (const segment of Object.keys(SEGMENTS)) {
      const restValue = typeof rest === 'function' ? rest(pose) : rest;
      const points = values(pose, segment) ?? [
        [0, restValue],
        [length(segment), restValue],
      ];
      for (const [offset, v, ease] of points) keys.push([at(poseIndex, segment, offset), v, ease]);
    }
  });
  return animated(keys);
}

/** 整個區段維持同一個值. */
const hold = (segment, v) => [[0, v], [length(segment), v]];

/** 逐 frame 烘焙成線性 keyframe: 從 `from` 開始 `frames` 個 frame, `fn(t)` 的 t 從 0 到 1. */
const bake = (from, frames, fn) => Array.from({ length: frames + 1 }, (_, k) => [from + k, fn(k / frames), 'linear']);

const round = (v) => Math.round(v * 100) / 100;
const lerp = (a, b, t) => [round(a[0] + (b[0] - a[0]) * t), round(a[1] + (b[1] - a[1]) * t)];

// --- 基本形狀: 位置與大小可以是固定值或 keyframe. ---

const prop = (v) => (Array.isArray(v) ? value(v) : v);
const oval = (name, position, size) => ({ ty: 'el', nm: name, p: prop(position), s: prop(size) });
const shape = (vertices, closed, inTangents, outTangents) => ({
  c: closed,
  v: vertices,
  i: inTangents ?? vertices.map(() => [0, 0]),
  o: outTangents ?? vertices.map(() => [0, 0]),
});
const path = (name, vertices, closed, inTangents, outTangents) => ({ ty: 'sh', nm: name, ks: value(shape(vertices, closed, inTangents, outTangents)) });
const line = (name, from, to) => path(name, [from, to], false);
const tint = (color, opacity) => ({ ...fill(color), o: value(opacity) });

/**
 * 通過每個點的平滑曲線 (Catmull-Rom 換算成 bezier): 每個點的切線是前後兩點差的 1/6.
 * 用少數輪廓點畫出身體, 尾巴等有機的形狀.
 */
function smoothShape(points, closed = true) {
  const n = points.length;
  const get = (i) => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  const tangents = points.map((_, i) => {
    const [a, b] = [get(i - 1), get(i + 1)];
    return [round((b[0] - a[0]) / 6), round((b[1] - a[1]) / 6)];
  });
  return shape(points, closed, tangents.map(([x, y]) => [-x, -y]), tangents);
}
const smooth = (name, points, closed = true) => ({ ty: 'sh', nm: name, ks: value(smoothShape(points, closed)) });
/** 有外框的實心平滑形狀. */
const part = (name, points, color, outline = 1.6) => group(name, [smooth(name, points), stroke(COLORS.line, outline), fill(color)]);
/** 有外框的實心橢圓, 可以旋轉. */
const blob = (name, position, size, color, rotation = 0, outline = 1.4) =>
  group(name, [oval(name, [0, 0], size), stroke(COLORS.line, outline), fill(color)], transform({ p: value(position), r: value(rotation) }));

/** 扇貝: 寬 12, 高 10, 中心在 `[0, 0]`; 鉸鏈在下方. */
function shellShapes() {
  const ridgeBase = [0, 3.5];
  return [
    group('ridges', [
      line('ridge left', ridgeBase, [-3.2, -2.6]),
      line('ridge middle', ridgeBase, [0, -4]),
      line('ridge right', ridgeBase, [3.2, -2.6]),
      stroke(COLORS.shellLine, 1),
    ]),
    group('hinge', [oval('hinge', [0, 5], [5, 2.5]), stroke(COLORS.shellLine, 1), fill(COLORS.shell)]),
    group('fan', [
      path(
        'fan',
        [[0, 5], [-6, -0.5], [0, -5], [6, -0.5]],
        true,
        [[0, 0], [0, 0], [-3.4, 0], [0, -3.2]],
        [[0, 0], [0, -3.2], [3.4, 0], [0, 0]],
      ),
      stroke(COLORS.shellLine, 1.2),
      fill(COLORS.shell),
    ]),
  ];
}

// --- 頭: Q 版的米白色圓臉, 頭的座標以頭的中心為原點. ---

/** 眨眼: 眼睛與反光縱向壓扁再張開. */
const eyeSize = timeline([3.8, 4.6], (_, segment) => (segment === 'blink' ? [[0, [3.8, 4.6]], [5, [3.8, 0.7]], [11, [3.8, 4.6]]] : null));
const shineSize = timeline([1.5, 1.5], (_, segment) => (segment === 'blink' ? [[0, [1.5, 1.5]], [5, [1.5, 0]], [11, [1.5, 1.5]]] : null));

/** 嘴: 平常是 ω 形的微笑; 丟貝殼與拿著齒輪時張開. */
const OPEN_MOUTH = [4.4, 4];
const SHUT_MOUTH = [0, 0];
const mouthSize = timeline(SHUT_MOUTH, (_, segment) => {
  if (segment === 'open') return [[0, SHUT_MOUTH], [5, OPEN_MOUTH]];
  if (['spit', 'hold', 'stillGear'].includes(segment)) return hold(segment, OPEN_MOUTH);
  if (segment === 'gulp') return [[0, OPEN_MOUTH], [9, OPEN_MOUTH], [11, SHUT_MOUTH]];
  return null;
});

const EYES = [[-6.5, -2.5], [6.5, -2.5]];
/** 頭: `position` 是頭的中心, `rotation` 是歪頭的角度, `size` 是縮放 (%). */
const headAt = (position, rotation, size) =>
  group(
    'head',
    [
      group('shine', [...EYES.map(([x, y], k) => oval(`shine ${k}`, [x + 0.8, y - 1.2], shineSize)), fill(COLORS.shine)]),
      group('eyes', [...EYES.map((p, k) => oval(`eye ${k}`, p, eyeSize)), fill(COLORS.eye)]),
      group('nose shine', [oval('nose shine', [-1.2, 1.4], [2, 1]), fill(COLORS.shine)]),
      group('nose', [smooth('nose', [[-3.8, 1.4], [0, 0.6], [3.8, 1.4], [0, 4.6]]), fill(COLORS.nose)]),
      group('smile', [
        path('smile', [[-3.2, 6.4], [0, 6.2], [3.2, 6.4]], false, [[0, 0], [-0.7, 1.6], [0.5, 1.6]], [[-0.5, 1.6], [0.7, 1.6], [0, 0]]),
        line('philtrum', [0, 4.6], [0, 6.2]),
        stroke(COLORS.line, 1),
      ]),
      group('mouth', [oval('mouth', [0, 8.6], mouthSize), fill(COLORS.mouth)]),
      group('whiskers', [
        line('whisker 0', [-8, 4], [-13, 3]),
        line('whisker 1', [-8, 6], [-13, 7]),
        line('whisker 2', [8, 4], [13, 3]),
        line('whisker 3', [8, 6], [13, 7]),
        stroke(COLORS.whisker, 0.8),
      ]),
      group('blush', [oval('blush 0', [-10, 4.5], [5, 3]), oval('blush 1', [10, 4.5], [5, 3]), tint(COLORS.blush, 85)]),
      part('face', [[0, -13.5], [11, -11], [16, -2], [13.5, 8], [5, 12.5], [-5, 12.5], [-13.5, 8], [-16, -2], [-11, -11]], COLORS.face),
      blob('ear 0', [-12, -9.5], [7, 6.5], COLORS.fur, -30),
      blob('ear 1', [12, -9.5], [7, 6.5], COLORS.fur, 30),
    ],
    transform({ p: value(position), r: value(rotation), s: value([size, size]) }),
  );

// --- 手與貝殼: 手臂是肩膀到手掌的線, 跟著手掌移動. ---

/**
 * 一組手與貝殼的位置. `shoulders` 與 `paws` 是兩隻手; `open` 是兩手往外張開的位移, `clap` 是拍手的位置.
 * `shell` 是抱著的貝殼, `lift` 是 hover 時把貝殼舉起的位移, `turn` 是貝殼的角度 (鉸鏈朝下巴).
 */
const LYING = {
  shoulders: [[-1, -28], [-1, 0]],
  paws: [[-7.5, -22], [-7.5, -6]],
  open: [[0, -2.5], [0, 2.5]],
  clap: [[-8.5, -19], [-8.5, -9]],
  shell: [-6.5, -14],
  lift: [-3, 0],
  turn: 90,
};
const PEEK = {
  shoulders: [[-12, 40], [12, 40]],
  paws: [[-8, 33], [8, 33]],
  open: [[-2.5, 0], [2.5, 0]],
  clap: [[-4, 34], [4, 34]],
  shell: [0, 34],
  lift: [0, 3],
  turn: 180,
};
const shellUp = (hands) => add(hands.shell, hands.lift);

const TOSS = 16;

/** 一隻手掌在各區段的位置; 閒置時拋接貝殼再拍兩下, hover 時舉起, 丟出, 拿到齒輪時拍手. */
function pawKeys(hands, side, segment) {
  const base = hands.paws[side];
  const wide = add(base, hands.open[side]);
  const pat = add(base, hands.open[side], -0.4);
  const up = add(base, hands.lift);
  const clap = hands.clap[side];
  if (segment === 'idle') {
    return [[0, base], [3, wide], [TOSS - 3, wide], [TOSS, base], [26, pat], [30, base], [34, pat], [38, base], [59, base]];
  }
  if (segment === 'open') return [[0, base], [5, up]];
  if (segment === 'spit') return [[0, up], [3, add(up, hands.open[side])], [10, base], [17, base]];
  if (segment === 'hold') return [[0, base], [7, clap], [14, base], [21, clap], [29, base]];
  if (segment === 'gulp') return [[0, base], [7, add(up, hands.open[side])], [11, base]];
  return null;
}

/** 閒置: 從正上方看, 往上拋就是貝殼變大 (靠近鏡頭), 同時像硬幣一樣翻一圈再接住. */
const tossScale = (t) => {
  const near = 100 + 55 * Math.sin(Math.PI * t);
  return [round(near), round(near * Math.cos(2 * Math.PI * t))];
};
const shellScale = timeline([100, 100], (_, segment) => {
  if (segment === 'idle') return [...bake(0, TOSS, tossScale), [59, [100, 100]]];
  if (segment === 'spit') return [[0, [100, 100]], [1, [0, 0]], [17, [0, 0]]];
  if (segment === 'hold' || segment === 'stillGear') return hold(segment, [0, 0]);
  if (segment === 'gulp') return [[0, [0, 0]], [9, [0, 0]], [10, [100, 100]], [11, [100, 100]]];
  return null;
});

/** 手掌, 抱著的貝殼與手臂. */
function makeHands(hands) {
  const armShape = (shoulder, paw) => shape([shoulder, paw], false);
  const pawPosition = (side) => timeline(hands.paws[side], (_, segment) => pawKeys(hands, side, segment));
  const arm = (side) =>
    timeline(armShape(hands.shoulders[side], hands.paws[side]), (_, segment) =>
      pawKeys(hands, side, segment)?.map(([t, paw]) => [t, armShape(hands.shoulders[side], paw)]),
    );
  const paw = (side) => group(`paw ${side}`, [oval('paw', pawPosition(side), [7, 6]), stroke(COLORS.line, 1.3), fill(COLORS.paw)]);
  const limb = (side) =>
    group(`arm ${side}`, [
      group('arm', [{ ty: 'sh', nm: 'arm', ks: arm(side) }, stroke(COLORS.fur, 4.4)]),
      group('arm outline', [{ ty: 'sh', nm: 'arm', ks: arm(side) }, stroke(COLORS.line, 7)]),
    ]);
  const up = shellUp(hands);
  const shellPosition = timeline(hands.shell, (_, segment) => {
    if (segment === 'open') return [[0, hands.shell], [5, up]];
    if (segment === 'spit') return hold(segment, up);
    if (segment === 'gulp') return [[0, up], [10, up], [11, hands.shell]];
    return null;
  });
  return {
    paws: group('paws', [paw(0), paw(1)]),
    shell: group('shell', shellShapes(), transform({ p: shellPosition, s: shellScale, r: value(hands.turn) })),
    arms: group('arms', [limb(0), limb(1)]),
  };
}

/** 後腳: 腳掌朝上的蹼足, 有三個肉球. */
const foot = (name, position, rotation) =>
  group(
    name,
    [
      group('pads', [oval('pad 0', [-2.6, -2.4], [2, 2]), oval('pad 1', [0, -3.4], [2, 2]), oval('pad 2', [2.6, -2.4], [2, 2]), oval('pad 3', [0, 1], [4, 3]), fill(COLORS.pad)]),
      group('sole', [oval('sole', [0, 0], [10, 11]), stroke(COLORS.line, 1.3), fill(COLORS.paw)]),
    ],
    transform({ p: value(position), r: value(rotation) }),
  );

/** 浮在水上輕輕起伏. */
const bob = timeline([0, 0], (_, segment) =>
  segment === 'idle' ? [[0, [0, 0]], [15, [0, -1]], [45, [0, 1]], [59, [0, 0]]] : null,
);

/** 潛水 (整組往螢幕外退) 與冒出. */
const retreat = timeline([0, 0], (pose, segment) => {
  const out = toLocalVec(pose, [-pose.dir[0] * DUCK, -pose.dir[1] * DUCK]);
  const over = toLocalVec(pose, [pose.dir[0] * 4, pose.dir[1] * 4]);
  if (segment === 'duck') return [[0, [0, 0]], [11, out]];
  if (segment === 'pop') return [[0, out], [10, over], [17, [0, 0]]];
  return null;
});
const shownWhen = (peek) => timeline((pose) => (pose.peek === peek ? 100 : 0), () => null);

// --- 水: 不規則的水漥, 沒有外框; 外圈淡淡暈開, 水面有白色反光與藍色波紋. ---

/** 水漥輪廓的另一個樣子: 每個點偏移一點點; 閒置時在兩個樣子之間慢慢變形, 像水在晃. */
const wobble = (points) => points.map(([x, y], i) => [round(x + 1.6 * Math.sin(i * 1.7)), round(y + 1.6 * Math.cos(i * 2.3))]);
const flowing = (points) => {
  const [calm, moved] = [smoothShape(points), smoothShape(wobble(points))];
  return timeline(calm, (_, segment) => (segment === 'idle' ? [[0, calm], [30, moved], [59, calm]] : null));
};
/** `center` 是外圈暈開的中心; `glints` (白色反光) 與 `waves` (藍色波紋) 是開放的弧線. */
function water(name, points, center, { glints, waves }) {
  const surface = flowing(points);
  return group(name, [
    group('glints', [...glints.map((p, k) => smooth(`glint ${k}`, p, false)), { ...stroke(COLORS.ripple, 1.3), o: value(90) }]),
    group('waves', [...waves.map((p, k) => smooth(`wave ${k}`, p, false)), { ...stroke(COLORS.waterRim, 1), o: value(80) }]),
    group('surface', [{ ty: 'sh', nm: 'surface', ks: surface }, tint(COLORS.water, 90)]),
    group('halo', [{ ty: 'sh', nm: 'halo', ks: surface }, tint(COLORS.water, 35)], transform({ a: value(center), p: value(center), s: value([108, 110]) })),
  ]);
}

// --- 橫躺 (左, 右, 下緣): 胖胖的水獺仰躺在水池中, 頭在 -x, 身體, 後腳與尾巴往 +x. ---

const lyingHands = makeHands(LYING);
const lyingOtter = group(
  'otter',
  [
    lyingHands.paws,
    lyingHands.shell,
    lyingHands.arms,
    headAt([-28, -15], -10, 108),
    foot('foot 0', [20, -25], 80),
    foot('foot 1', [20, -3], 100),
    group('belly', [oval('belly', [6, -14], [32, 23]), fill(COLORS.belly)]),
    part('body', [[-16, -25], [-4, -31.5], [12, -31], [25, -24], [29.5, -14], [25, -4], [12, 3], [-4, 3.5], [-16, -3]], COLORS.fur),
    part('tail', [[23, -19.5], [33, -18], [41, -14], [33, -10], [23, -8.5]], COLORS.fur),
  ],
  transform({ p: bob }),
);
/**
 * 水漥的輪廓 (本地座標). 往尾巴那側 (+x) 不能碰到鏈端的珠子: 珠子在 (75, -42), 半徑 42,
 * 所以 y = -38 時 x 最多約 33, y = -18 時約 40.
 */
const LYING_WATER = [
  [-52, -18], [-46, -34], [-30, -40], [-10, -38], [6, -42], [24, -38], [33, -29], [38, -18],
  [44, -6], [36, 6], [18, 10], [0, 8], [-18, 12], [-38, 6], [-50, -4],
];
const lyingPool = water('pool', LYING_WATER, [-4, -14], {
  glints: [
    [[-45, -24], [-40, -32], [-31, -36]],
    [[16, 6], [26, 4], [33, -1]],
    [[25, -35], [31, -29]],
    [[-10, 5.5], [0, 7], [10, 5]],
  ],
  waves: [
    [[-42, -1], [-32, 4], [-22, 5]],
    [[2, -38], [12, -40], [20, -37]],
    [[36, -14], [39, -6]],
  ],
});
const lying = group(
  'lying',
  [group('swim', [lyingOtter, lyingPool], transform({ p: retreat }))],
  transform({ p: value([C, C]), s: timeline((pose) => [100 * pose.flip, 100], () => null), o: shownWhen(false) }),
);

// --- 探頭 (上緣): 水面貼著上緣, 只有頭與抱著貝殼的雙手冒出水面, 身體在水下隱約可見. ---

const peekHands = makeHands(PEEK);
/**
 * 上緣的水漥 (畫布座標): 上半部超出螢幕, 探出時仍連著邊緣. 兩側不能碰到珠子:
 * 珠子在 (±75, 42), 半徑 42, 所以 y = 14 時 |x| 最多約 35, y = 32 時約 34.
 */
const PEEK_WATER = [
  [-40, -36], [-4, -42], [36, -38], [42, -16], [34, 0], [33, 16], [28, 32], [12, 44],
  [-8, 42], [-22, 36], [-32, 22], [-36, 6], [-44, -12],
];
const peekPool = water('pool', PEEK_WATER, [0, 4], {
  glints: [
    [[-31, 10], [-29, 20], [-23, 28]],
    [[23, 32], [14, 40]],
  ],
  waves: [
    [[-16, 38], [-6, 40]],
    [[29, 6], [29, 17]],
  ],
});
const peeking = group(
  'peeking',
  [
    group(
      'swim',
      [
        group('above water', [peekHands.paws, peekHands.shell, headAt([0, 18], -6, 110)], transform({ p: bob })),
        group('neck ripples', [
          smooth('neck ripple left', [[-23, 29], [-18, 33.5], [-10, 35.5]], false),
          smooth('neck ripple right', [[23, 29], [18, 33.5], [10, 35.5]], false),
          { ...stroke(COLORS.ripple, 1.5), o: value(90) },
        ]),
        group('water over', [{ ty: 'sh', nm: 'water over', ks: flowing(PEEK_WATER) }, tint(COLORS.water, 60)]),
        group('body', [oval('body', [0, 34], [32, 16]), fill(COLORS.fur)]),
        peekPool,
      ],
      transform({ p: retreat }),
    ),
  ],
  transform({ p: value([C, C]), o: shownWhen(true) }),
);

const otter = {
  ty: 4,
  nm: 'otter',
  ind: 2,
  ip: 0,
  op: TOTAL_FRAMES,
  st: 0,
  sr: 1,
  ks: { a: value([0, 0]), p: value([0, 0]), s: value([100, 100]), r: value(0), o: value(100) },
  shapes: [lying, peeking],
};

// --- 齒輪圖層: 位置是 app 寫入的 `gear` slot. 飛行的貝殼也在這個圖層, 以齒輪中心為原點. ---

/** hover 時齒輪中心在畫布上的位置 (相對畫布中心). 丟出時 `bud ≥ 0.2`, 畫布已經探出 `lean × radius`. */
const gearAt = (pose) => add(add([0, 0], pose.way, GEAR.gap - GAP), pose.dir, BEAD_RADIUS - LEAN * RADIUS);
/** 貝殼起飛的位置 (齒輪座標): 舉起的貝殼減去齒輪中心. */
const launch = (pose) => {
  const [sx, sy] = toCanvas(pose, shellUp(pose.peek ? PEEK : LYING));
  const [gx, gy] = gearAt(pose);
  return [round(sx - gx), round(sy - gy)];
};
/** 往螢幕內側拋出的弧線高度. */
const ARC = 22;
const FLY = 11;
const BACK_FROM = 4;
const BACK = 5;
const BIG_SHELL = 220;

/** 丟出: 貝殼從手中拋向齒輪 (逐 frame 烘焙). 吸回: 從齒輪飛回手中. */
const flight = (pose, t, ease) => add(lerp(launch(pose), [0, 0], ease), pose.dir, Math.sin(Math.PI * t) * ARC).map(round);
const grow = (t) => round(100 + (BIG_SHELL - 100) * t);

const flyingShellPosition = timeline([0, 0], (pose, segment) => {
  if (segment === 'spit') return [...bake(0, FLY, (t) => flight(pose, t, 1 - (1 - t) ** 2)), [17, [0, 0]]];
  if (segment === 'gulp') return [[0, [0, 0]], ...bake(BACK_FROM, BACK, (t) => flight(pose, 1 - t, 1 - t * t)), [11, launch(pose)]];
  return null;
});
const flyingShellScale = timeline([0, 0], (_, segment) => {
  if (segment === 'spit') return [...bake(0, FLY, (t) => [grow(t), grow(t)]), [16, [0, 0]], [17, [0, 0]]];
  if (segment === 'gulp') return [[0, [0, 0]], ...bake(BACK_FROM, BACK, (t) => [grow(1 - t), grow(1 - t)]), [10, [0, 0]], [11, [0, 0]]];
  return null;
});
const flyingShellSpin = timeline(0, (_, segment) => {
  if (segment === 'spit') return [...bake(0, FLY, (t) => round(-360 * (1 - t) ** 2)), [17, 0]];
  if (segment === 'gulp') return [[0, 360], ...bake(BACK_FROM, BACK, (t) => round(360 * (1 - t * t))), [11, 0]];
  return null;
});

/** 齒輪: 貝殼落地後變成齒輪, 轉著長大; 吸回時轉著縮小, 變回貝殼. 其他區段不畫 (縮放為 0). */
const gearScale = timeline([0, 0], (_, segment) => {
  if (segment === 'spit') return [[0, [0, 0]], [FLY, [0, 0]], [15, [115, 115]], [17, [100, 100]]];
  if (segment === 'hold' || segment === 'stillGear') return hold(segment, [100, 100]);
  if (segment === 'gulp') return [[0, [100, 100]], [BACK_FROM, [0, 0]], [11, [0, 0]]];
  return null;
});
const gearSpin = timeline(0, (_, segment) => {
  if (segment === 'spit') return [[0, -120], [FLY, -120], [17, 0]];
  if (segment === 'hold') return [[0, 0], [15, 12], [29, 0]];
  if (segment === 'gulp') return [[0, 0], [BACK_FROM, -120], [11, -120]];
  return null;
});
const GEAR_REST = [200, 40];

const gear = {
  ty: 4,
  nm: 'gear',
  ind: 1,
  ip: 0,
  op: TOTAL_FRAMES,
  st: 0,
  sr: 1,
  ks: { a: value([0, 0]), p: { a: 0, k: GEAR_REST, sid: GEAR_SLOT }, s: value([100, 100]), r: value(0), o: value(100) },
  shapes: [
    group('flying shell', shellShapes(), transform({ p: flyingShellPosition, s: flyingShellScale, r: flyingShellSpin })),
    group(
      'gear',
      gearShapes(GEAR.radius, { ink: COLORS.line, disc: COLORS.shell, outline: COLORS.shellLine }),
      transform({ s: gearScale, r: gearSpin }),
    ),
  ],
};

const markers = POSE_NAMES.flatMap((pose, poseIndex) =>
  Object.keys(SEGMENTS).map((segment) => ({ cm: `${segment}-${pose}`, tm: at(poseIndex, segment), dr: end(poseIndex, segment) - at(poseIndex, segment) })),
);

const animation = {
  v: '5.12.0',
  fr: FR,
  ip: 0,
  op: TOTAL_FRAMES,
  w: SIZE,
  h: SIZE,
  nm: '小水獺',
  ddd: 0,
  assets: [],
  markers,
  slots: gearSlots(GEAR_REST),
  layers: [gear, otter],
};

// --- state machine: 各姿勢一組 state, 名稱為 `<區段>-<edge>-<along>`. ---

const guard = (type, inputName, conditionType, compareTo) => ({ type, inputName, conditionType, compareTo });
const to = (toState, ...guards) => ({ type: 'Transition', toState, guards });
const set = (inputName, number) => ({ type: 'SetNumeric', inputName, value: number });
const hovering = (on) => guard('Boolean', 'hovering', 'Equal', on);
const reduced = (on) => guard('Boolean', 'reducedMotion', 'Equal', on);
const step = guard('Numeric', 'step', 'Equal', 1);
const budAtLeast = guard('Numeric', 'bud', 'GreaterThanOrEqual', 0.2);
const budBelow = guard('Numeric', 'bud', 'LessThan', 0.2);

function playback(segment, pose, { loop = false, autoplay = true, transitions = [], entry = [] } = {}) {
  return {
    name: `${segment}-${pose}`,
    type: 'PlaybackState',
    animation: 'otter',
    segment: `${segment}-${pose}`,
    loop,
    autoplay,
    // `step` 由 OnComplete 設為 1, 表示這個區段播完; 每個 state 進入時歸零.
    entryActions: [set('step', 0), ...entry],
    transitions,
  };
}

/** 換邊或換方向: 停著的 state 依新的 `edge` 與 `along` 換成那個姿勢的同一種 state. */
const movePose = (pose, segment) =>
  POSE_NAMES.filter((other) => other !== pose).map((other) =>
    to(`${segment}-${other}`, guard('String', 'edge', 'Equal', POSES[other].edge), guard('String', 'along', 'Equal', POSES[other].along)),
  );

const states = POSE_NAMES.flatMap((pose) => [
  // 閒置: 每播完一輪抽一次 `roll`, 小於 0.2 眨眼, 0.2 到 0.35 潛水再冒出 (觸發柔軟身體).
  playback('idle', pose, {
    loop: true,
    transitions: [
      to(`still-${pose}`, reduced(true)),
      to(`open-${pose}`, hovering(true)),
      ...movePose(pose, 'idle'),
      to(`blink-${pose}`, guard('Numeric', 'roll', 'LessThan', 0.2)),
      to(`duck-${pose}`, guard('Numeric', 'roll', 'LessThan', 0.35)),
    ],
  }),
  playback('blink', pose, {
    entry: [set('roll', 1)],
    transitions: [to(`open-${pose}`, hovering(true)), ...movePose(pose, 'idle'), to(`idle-${pose}`, step)],
  }),
  playback('duck', pose, {
    entry: [set('roll', 1)],
    transitions: [to(`open-${pose}`, hovering(true)), ...movePose(pose, 'idle'), to(`pop-${pose}`, step)],
  }),
  playback('pop', pose, {
    transitions: [to(`open-${pose}`, hovering(true)), ...movePose(pose, 'idle'), to(`idle-${pose}`, step)],
  }),
  // hover: 把貝殼舉起來; 探出完成 (`bud` ≥ 0.2) 後才丟出.
  playback('open', pose, {
    transitions: [to(`still-${pose}`, reduced(true)), to(`idle-${pose}`, hovering(false)), to(`spit-${pose}`, budAtLeast)],
  }),
  playback('spit', pose, {
    transitions: [to(`still-${pose}`, reduced(true)), to(`gulp-${pose}`, hovering(false)), to(`hold-${pose}`, step)],
  }),
  playback('hold', pose, {
    loop: true,
    transitions: [to(`still-${pose}`, reduced(true)), to(`gulp-${pose}`, hovering(false))],
  }),
  // 收回: 齒輪變回貝殼飛回手中; `bud` 回到 0.2 以下時回到閒置, 齒輪一定在探出縮回前消失.
  playback('gulp', pose, {
    transitions: [to(`still-${pose}`, reduced(true)), to(`spit-${pose}`, hovering(true), budAtLeast), to(`idle-${pose}`, budBelow)],
  }),
  // 減少動態: 停在不播放的畫面; hover 且探出完成時顯示齒輪.
  playback('still', pose, {
    autoplay: false,
    transitions: [to(`idle-${pose}`, reduced(false)), ...movePose(pose, 'still'), to(`stillGear-${pose}`, hovering(true), budAtLeast)],
  }),
  playback('stillGear', pose, {
    autoplay: false,
    transitions: [to(`idle-${pose}`, reduced(false)), to(`still-${pose}`, budBelow)],
  }),
]);

const interactions = POSE_NAMES.flatMap((pose) => [
  { type: 'OnLoopComplete', stateName: `idle-${pose}`, actions: [{ type: 'SetRandom', inputName: 'roll', min: 0, max: 1 }] },
  ...['blink', 'duck', 'pop', 'spit'].map((segment) => ({
    type: 'OnComplete',
    stateName: `${segment}-${pose}`,
    actions: [set('step', 1)],
  })),
]);

const stateMachine = {
  initial: 'idle-right-up',
  inputs: [
    { type: 'String', name: 'edge', value: 'right' },
    { type: 'String', name: 'along', value: 'up' },
    { type: 'Boolean', name: 'hovering', value: false },
    { type: 'Boolean', name: 'dragging', value: false },
    { type: 'Numeric', name: 'bud', value: 0 },
    { type: 'Boolean', name: 'reducedMotion', value: false },
    // 自己的 input: 閒置動作的亂數與區段播完的旗標.
    { type: 'Numeric', name: 'roll', value: 1 },
    { type: 'Numeric', name: 'step', value: 0 },
  ],
  interactions,
  states,
};

const manifest = {
  format: 1,
  id: 'otter',
  name: '小水獺',
  author: 'seanmars',
  radius: RADIUS,
  canvas: CANVAS,
  gap: GAP,
  lean: LEAN,
  gear: GEAR,
  jiggle: { stiffness: 260, damping: 7, thin: 0.5, appear: 2.8, hide: -1.8, spit: -2.6, gulp: 2.2 },
  kicks: Object.fromEntries(POSE_NAMES.flatMap((pose) => [[`duck-${pose}`, -1.8], [`pop-${pose}`, 2.8]])),
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'animation.json'), `${JSON.stringify(animation, null, 2)}\n`);
writeFileSync(join(OUT, 'state-machine.json'), `${JSON.stringify(stateMachine, null, 2)}\n`);
writeFileSync(join(OUT, 'companion.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${OUT}`);
