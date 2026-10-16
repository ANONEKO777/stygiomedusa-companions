// 夥伴K 能力變化的共用核心: 從 companionk/generate.mjs 拆出, 各能力 (劍, 傘, 睡眠, 冰, 鎚) 的 generate.mjs 呼叫 build(ability).
// 身體, 臉, 閒置動作, 吐出星星與齒輪, 吸回, state machine 都與夥伴K相同; 能力只提供帽子 (hat), 手上的武器 (held),
// 額外的圖層 (layers) 與逐 frame 的調整 (frame). 睡眠能力另外設 sleep: 閒置時趴下, hover 才醒來.
// 這個資料夾不是夥伴, 只放共用的程式.
//
// 與原本不同之處 (dotLottie 的限制) 同 companionk/generate.mjs:
// - 只有一條時間軸: 搖擺的週期改為與呼吸相同的 2.8 秒; 閒置動作只在每 2.8 秒一輪結束時抽籤, 停留時間固定 1 秒.
// - 吐出與吸回依時間播放, 時間由史萊姆 `bud` 的 0.9 秒 ease-in-out 換算; 中途反向時改為吸回.
// - 星星與飛回的齒輪從嘴出發的位置依 `edge` 與 `along` 預先計算 (每個組合一段時間軸); 夥伴在角落旁, 齒輪繞到
//   另一條邊時只是近似 (落點仍是 app 給的齒輪位置).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// --- manifest 數值 (私人 build 的實機調整) ---
const R = 32;
const CANVAS = 120;
const GAP = 75;
const LEAN = 0.8;
const GEAR = { gap: 150, radius: 24 };
const BEAD_RADIUS = 42;
const C = CANVAS;
const FR = 60;

// --- companionK.ts (尺寸以半徑為 1) ---
const hex = (value) => [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16) / 255);
const COLORS = {
  body: hex('#f5a3c4'),
  outline: hex('#c9577e'),
  foot: hex('#d81b4a'),
  eye: hex('#1b1b2f'),
  iris: hex('#3a6fd8'),
  shine: hex('#ffffff'),
  blush: hex('#ef5f8f'),
  mouth: hex('#8c1d3a'),
  mouthInside: hex('#7a1430'),
  star: hex('#ffd84a'),
  starOutline: hex('#e09b00'),
  gearFill: hex('#000000'),
  gearInk: hex('#ffffff'),
};
const OUTLINE = 0.07;
const FACE = {
  eye: { x: 0.17, y: -0.2, rx: 0.09, ry: 0.24 },
  blush: { x: 0.46, y: 0.06, rx: 0.14, ry: 0.07 },
  mouth: { y: 0.17, width: 0.08, depth: 0.06 },
};
const LIMBS = { arm: { x: 0.88, y: 0.12, r: 0.28 }, foot: { x: 0.42, y: 0.84, rx: 0.42, ry: 0.24, tilt: 18 } };
const SPIT = { lean: [0, 0.2], open: [0.08, 0.25], flight: [0.25, 0.75], burst: [0.75, 0.9], arc: 0.3, star: 0.9, spin: 540, sparkles: 6, sparkleReach: 1.8, sparkleSize: 0.3 };
const SWALLOW = { puff: [0.08, 0.28], widen: 0.14 };
/** 週期改為 2.8 秒的整數倍才能接成迴圈: 吸氣的脈動 5 次, 抖動的兩個頻率各 16 與 6 次 (原本 11, 37, 13 rad/s). */
const LOOP = 2.8;
const INHALE = { lines: 4, period: 0.7, from: 2.6, to: 1.2, length: 0.5, spread: 0.75, tremble: 2.5, fast: (2 * Math.PI * 16) / LOOP, slow: (2 * Math.PI * 6) / LOOP };
const BREATH = { period: LOOP, amount: 0.035, inhale: 0.06, inhaleRate: (2 * Math.PI * 5) / LOOP };
const JIGGLE_THIN = 0.5;
const TILT = { pivot: 0.9, side: 12, sway: 4, swayPeriod: LOOP };
const IDLE = {
  duck: -0.5,
  peek: 0.28,
  look: 0.07,
  hold: 1.0,
  away: { stiffness: 320, damping: 22 },
  back: { stiffness: 170, damping: 10 },
  glance: { stiffness: 200, damping: 18 },
  blink: 0.2,
};
/** 史萊姆的齒輪進度: 0.9 秒 ease-in-out (BubbleWindow `SLIME.budTween`). */
const BUD_SECONDS = 0.9;

const EDGES = {
  right: { dir: [-1, 0], turn: 0, tilt: -1, armY: LIMBS.arm.y, front: Math.PI },
  bottom: { dir: [0, -1], turn: 0, tilt: 0, armY: 0, front: -Math.PI / 2 },
  left: { dir: [1, 0], turn: 0, tilt: 1, armY: LIMBS.arm.y, front: 0 },
  top: { dir: [0, 1], turn: 180, tilt: 0, armY: 0, front: -Math.PI / 2 },
};
/** `along` 的方向: 沿螢幕邊緣從鏈端珠子往夥伴 (再往齒輪). */
const DIRECTIONS = { up: [0, -1], left: [-1, 0], right: [1, 0] };
/** app 送出的 `edge` 與 `along` 的組合 (stygiomedusa companion-pack design D11): 左右邊一律往上, 上下緣往左或往右. */
const VIEWS = [
  { edge: 'right', along: 'up' },
  { edge: 'bottom', along: 'left' },
  { edge: 'bottom', along: 'right' },
  { edge: 'left', along: 'up' },
  { edge: 'top', along: 'right' },
  { edge: 'top', along: 'left' },
].map((view) => ({ ...view, name: `${view.edge}-${view.along}` }));

// --- 數學 ---
const span = (value, [from, to]) => Math.min(1, Math.max(0, (value - from) / (to - from)));
const easeOutBack = (value) => {
  const c1 = 1.70158;
  const t = value - 1;
  return 1 + (c1 + 1) * t * t * t + c1 * t * t;
};
/** motion 的 `easeInOut` = cubic-bezier(0.42, 0, 0.58, 1). */
function easeInOut(x) {
  const bezier = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let index = 0; index < 40; index += 1) {
    const mid = (lo + hi) / 2;
    if (bezier(mid, 0.42, 0.58) < x) lo = mid;
    else hi = mid;
  }
  return bezier((lo + hi) / 2, 0, 1);
}
const budAt = (seconds) => easeInOut(Math.min(1, Math.max(0, seconds / BUD_SECONDS)));
/** `bud` 從 0 往 1 到達 `value` 的時間. */
function budTime(value) {
  let lo = 0;
  let hi = BUD_SECONDS;
  for (let index = 0; index < 40; index += 1) {
    const mid = (lo + hi) / 2;
    if (budAt(mid) < value) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
const add = (a, b, scale = 1) => [a[0] + b[0] * scale, a[1] + b[1] * scale];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const turned = (edge, [x, y]) => (EDGES[edge].turn === 180 ? [-x, -y] : [x, y]);
/** 夥伴K座標 (以半徑為 1, 直立) 換成畫布座標; 不含歪頭 (hover 時已回正). */
const toCanvas = (edge, local, inset = 0) => add(add([C, C], EDGES[edge].dir, inset * R), turned(edge, local), R);

/** 齒輪的位置 (不在角落時, hover 探出後的畫布座標) 與嘴; 星星與飛回的齒輪以齒輪為原點. */
const gearAt = (view) => add(add([C, C], DIRECTIONS[view.along], GEAR.gap - GAP), EDGES[view.edge].dir, BEAD_RADIUS - LEAN * R);
const mouthFromGear = (view) => sub(toCanvas(view.edge, [0, FACE.mouth.y]), gearAt(view));

/** 從嘴到齒輪的弧線 (原本的 `flightPoint`), 以齒輪為原點. */
function flight(view, t) {
  const from = mouthFromGear(view);
  const lift = Math.hypot(from[0], from[1]) * SPIT.arc;
  const bend = add([from[0] / 2, from[1] / 2], EDGES[view.edge].dir, lift);
  const a = (1 - t) * (1 - t);
  const b = 2 * t * (1 - t);
  return [a * from[0] + b * bend[0], a * from[1] + b * bend[1]];
}

/** motion 的 spring (mass 1), 由事件序列驅動: `[秒, 目標, 參數]`; 回傳每 frame 的值. */
function springTrack(events, seconds, start = 0) {
  const dt = 1 / 2400;
  const values = [];
  let x = start;
  let v = 0;
  let target = start;
  let spec = IDLE.glance;
  let next = 0;
  const sorted = [...events].sort((a, b) => a[0] - b[0]);
  for (let frame = 0; frame <= Math.round(seconds * FR); frame += 1) {
    const until = frame / FR;
    for (let t = values.length === 0 ? 0 : (frame - 1) / FR; t < until; t += dt) {
      while (next < sorted.length && sorted[next][0] <= t) {
        [, target, spec] = sorted[next];
        next += 1;
      }
      v += (-spec.stiffness * (x - target) - spec.damping * v) * dt;
      x += v * dt;
    }
    values.push(x);
  }
  return (seconds_) => values[Math.min(values.length - 1, Math.round(seconds_ * FR))];
}

/** 眨眼: 0.2 秒 ease-in-out 的 [0, 1, 0], 每次間隔 0.26 秒. */
const blinkAt = (times) => (t) => {
  for (let index = 0; index < times; index += 1) {
    const local = (t - index * 0.26) / IDLE.blink;
    if (local >= 0 && local <= 1) return local < 0.5 ? easeInOut(local * 2) : easeInOut((1 - local) * 2);
  }
  return 0;
};

// --- 每個區段的狀態 (原本 CompanionK.vue 的 `scene`) ---

/** 閒置動作的時間: 停留固定 `IDLE.hold`. */
const DUCK_POP = 0.25 + IDLE.hold;
const PEEK_BACK = 0.4 + IDLE.hold;
const GLANCE_BACK = 0.3 + IDLE.hold;

const duckInset = springTrack([[0, IDLE.duck, IDLE.away], [DUCK_POP, 0, IDLE.back]], LOOP);
const peekInset = springTrack([[0, IDLE.peek, IDLE.back], [PEEK_BACK, 0, IDLE.back]], LOOP);
const peekLean = springTrack([[0, 1, IDLE.glance], [PEEK_BACK, 0, IDLE.glance]], LOOP);
const lookTrack = (side) => springTrack([[0, side, IDLE.glance], [GLANCE_BACK, 0, IDLE.glance]], LOOP);
const glanceLook = { left: lookTrack(-1), right: lookTrack(1) };
const peekLook = { left: springTrack([[0, -1, IDLE.glance], [PEEK_BACK, 0, IDLE.glance]], LOOP), right: springTrack([[0, 1, IDLE.glance], [PEEK_BACK, 0, IDLE.glance]], LOOP) };

const OPEN_SECONDS = budTime(0.2);
const SPIT_SECONDS = BUD_SECONDS - OPEN_SECONDS;

/** 預設的狀態: 閒置的姿勢. `time` 是呼吸與搖擺的時鐘 (秒). */
function rest(time) {
  return { time, inset: 0, lean: 0, look: 0, blink: 0, out: 0, open: 0, puff: 0, pumping: false, inhaling: false, still: false, star: null, sparkles: [], gear: null, lines: [], sleep: 0, snore: 0 };
}

/** 吐出 (`spitting`) 或吸回時, 依 `bud` 的星星, 小星星與齒輪 (原本的 `flight`). */
function flightState(view, bud, spitting, landed, time) {
  const t = span(bud, SPIT.flight);
  const along = flight(view, t);
  if (landed) {
    if (!spitting && t <= 0) return { star: null, sparkles: [], gear: null };
    const toward = mouthFromGear(view);
    const pull = spitting && t >= 1 ? INHALE.tremble * (0.6 + 0.4 * Math.sin(time * INHALE.fast) * Math.sin(time * INHALE.slow)) : 0;
    const distance = Math.hypot(...sub(toward, along)) || 1;
    const at = add(along, sub(toward, along), pull / distance);
    return { star: null, sparkles: [], gear: { at, scale: 0.2 + 0.8 * t, spin: SPIT.spin * (1 - t) } };
  }
  if (bud <= SPIT.flight[0]) return { star: null, sparkles: [], gear: null };
  const burst = span(bud, SPIT.burst);
  const r = GEAR.radius;
  const star = burst < 1 ? { at: along, size: SPIT.star * (0.4 + 0.6 * t) * (1 - burst), spin: SPIT.spin * t } : null;
  const sparkles = Array.from({ length: SPIT.sparkles }, (_, index) => {
    if (!(burst > 0 && burst < 1)) return null;
    const angle = (index / SPIT.sparkles) * 2 * Math.PI + 0.3;
    const reach = r * (0.6 + SPIT.sparkleReach * burst);
    return { at: [Math.cos(angle) * reach, Math.sin(angle) * reach], size: SPIT.sparkleSize * (1 - burst) };
  });
  const gear = burst > 0 ? { at: [0, 0], scale: easeOutBack(burst), spin: 0 } : null;
  return { star, sparkles, gear };
}

/** 吸氣的氣流線 (原本的 `inhaleLines`), 夥伴K座標. */
function inhaleLines(edge, time) {
  return Array.from({ length: INHALE.lines }, (_, index) => {
    const phase = (time / INHALE.period + index / INHALE.lines) % 1;
    const angle = EDGES[edge].front + INHALE.spread * ((2 * index) / (INHALE.lines - 1) - 1);
    const near = INHALE.from + (INHALE.to - INHALE.from) * phase;
    return { to: [Math.cos(angle) * near, FACE.mouth.y + Math.sin(angle) * near], angle, opacity: Math.sin(Math.PI * phase) };
  });
}

/** 吐出的過程 (`bud` 從 `from` 往 1): 張嘴, 探出整顆頭時回正, 星星飛出, 炸開成齒輪. */
function spitting(view, bud, time, landed) {
  const state = rest(time);
  state.out = span(bud, SPIT.lean);
  state.open = span(bud, SPIT.open);
  Object.assign(state, flightState(view, bud, true, landed, time));
  state.inhaling = state.open > 0.5 && landed;
  state.pumping = state.inhaling;
  if (state.pumping) state.lines = inhaleLines(view.edge, time);
  return state;
}

/** 吸回 (`bud` 從 1 往 0): 齒輪沿弧線飛回嘴裡並縮小, 鼓頰吞下, 閉嘴. */
function swallowing(view, bud, time) {
  const state = rest(time);
  state.out = span(bud, SPIT.lean);
  state.open = span(bud, [SWALLOW.puff[1], SWALLOW.puff[1] + 0.05]);
  state.puff = Math.sin(Math.PI * span(bud, SWALLOW.puff));
  Object.assign(state, flightState(view, bud, false, true, time));
  state.inhaling = state.open > 0.5;
  return state;
}


const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, x) => a + (b - a) * x;

/** 區段: 長度 (秒) 與 `sample(view, t)`. 閒置類的區段長度都是 2.8 秒, 呼吸與搖擺接得起來. */
const SEGMENTS = {
  idle: { seconds: LOOP, sample: (_, t) => rest(t) },
  blink: { seconds: LOOP, sample: (_, t) => ({ ...rest(t), blink: blinkAt(1)(t) }) },
  blink2: { seconds: LOOP, sample: (_, t) => ({ ...rest(t), blink: blinkAt(2)(t) }) },
  glanceL: { seconds: LOOP, sample: (_, t) => ({ ...rest(t), look: glanceLook.left(t) }) },
  glanceR: { seconds: LOOP, sample: (_, t) => ({ ...rest(t), look: glanceLook.right(t) }) },
  duck: { seconds: DUCK_POP, sample: (_, t) => ({ ...rest(t), inset: duckInset(t) }) },
  pop: { seconds: LOOP - DUCK_POP, sample: (_, t) => ({ ...rest(t + DUCK_POP), inset: duckInset(t + DUCK_POP) }) },
  peekA: { seconds: LOOP, sample: (view, t) => ({ ...rest(t), inset: peekInset(t), lean: peekLean(t), look: (EDGES[view.edge].tilt === 0 ? peekLook.left : EDGES[view.edge].tilt < 0 ? peekLook.left : peekLook.right)(t) }) },
  peekB: { seconds: LOOP, sample: (view, t) => ({ ...rest(t), inset: peekInset(t), lean: peekLean(t), look: (EDGES[view.edge].tilt === 0 ? peekLook.right : EDGES[view.edge].tilt < 0 ? peekLook.left : peekLook.right)(t) }) },
  /** 睡眠能力的閒置動作: 鼻涕泡泡慢慢脹大, 破掉. `snore` 是泡泡的進度 (0 到 1). */
  snore: { seconds: LOOP, sample: (_, t) => ({ ...rest(t), snore: span(t, [0.1, 2.3]) }) },
  open: { seconds: OPEN_SECONDS, sample: (view, t) => spitting(view, budAt(t), t, false) },
  // 呼吸的時鐘在吐出結束時回到 0, 接上含著齒輪的迴圈.
  spit: { seconds: SPIT_SECONDS, sample: (view, t) => spitting(view, budAt(OPEN_SECONDS + t), t - SPIT_SECONDS, budAt(OPEN_SECONDS + t) >= SPIT.burst[1]) },
  hold: { seconds: LOOP, sample: (view, t) => spitting(view, 1, t, true) },
  gulp: { seconds: BUD_SECONDS, sample: (view, t) => swallowing(view, 1 - budAt(t), t) },
  still: { seconds: 1 / FR, sample: () => ({ ...rest(0), still: true }) },
  stillGear: { seconds: 1 / FR, sample: () => ({ ...rest(0), still: true, gear: { at: [0, 0], scale: 1, spin: 0 } }) },
};
const AWAKE_SEGMENTS = ['idle', 'blink', 'blink2', 'glanceL', 'glanceR', 'duck', 'pop', 'peekA', 'peekB', 'open', 'spit', 'hold', 'gulp', 'still', 'stillGear'];
const SLEEP_SEGMENTS = ['idle', 'snore', 'open', 'spit', 'hold', 'gulp', 'still', 'stillGear'];

/** 趴下的程度 (0 到 1): 閒置與減少動態趴著, hover 的 `out` 從 0 到 1 時醒來, 吸回結束時再睡著. */
const LIE = { wide: 0.25, flat: 0.2, breath: 1.2 };

/** 夥伴K的變形 (原本的 `body`): 歪頭, 呼吸, 吸氣的脈動與鼓頰; `sleep` 時再壓扁. */
function pose(edge, state) {
  const lie = state.sleep ?? 0;
  const deep = EDGES[edge].dir[0] !== 0;
  let shape;
  if (state.still) shape = { tilt: 0, sx: 1, sy: 1, eyeDx: 0, eyeOpen: 1 };
  else {
    const sway = TILT.sway * Math.sin((2 * Math.PI * state.time) / TILT.swayPeriod);
    const tilt = (EDGES[edge].tilt * TILT.side * (1 + state.lean) + sway) * (1 - state.out);
    const pulse = state.pumping ? BREATH.inhale * (0.5 + 0.5 * Math.sin(state.time * BREATH.inhaleRate)) : 0;
    const along = 1 + pulse;
    const across = 1 - JIGGLE_THIN * pulse;
    const breath = Math.sin((2 * Math.PI * state.time) / BREATH.period);
    const amount = BREATH.amount * (1 + LIE.breath * lie);
    const sx = (deep ? along : across) * (1 - 0.7 * amount * breath) * (1 + SWALLOW.widen * state.puff);
    const sy = (deep ? across : along) * (1 + amount * breath) * (1 - 0.04 * state.puff);
    shape = { tilt: tilt * (1 - lie), sx, sy, eyeDx: state.look * IDLE.look, eyeOpen: 1 - 0.9 * state.blink };
  }
  shape.sx *= 1 + LIE.wide * lie;
  shape.sy *= 1 - LIE.flat * lie;
  // 左右邊趴下時沿著邊往下沉, 讓底部不離地; 上下緣不沉, 免得趴下後整隻藏到邊的外面.
  shape.shift = deep ? [0, R * LIE.flat * lie] : [0, 0];
  return shape;
}

// --- Lottie 圖層的基本元件 ---
const value = (k) => ({ a: 0, k });
const ellipse = (name, position, size) => ({ ty: 'el', nm: name, p: Array.isArray(position) ? value(position) : position, s: Array.isArray(size) ? value(size) : size });
const fill = (color, opacity = 100) => ({ ty: 'fl', nm: 'fill', c: value([...color, 1]), o: value(opacity), r: 1 });
const stroke = (color, width, extra = {}) => ({ ty: 'st', nm: 'stroke', c: value([...color, 1]), o: value(100), w: value(width), lc: 2, lj: 2, ...extra });
const transform = (extra = {}) => ({ ty: 'tr', nm: 'transform', p: value([0, 0]), a: value([0, 0]), s: value([100, 100]), r: value(0), o: value(100), ...extra });
const group = (name, items, tr = transform()) => ({ ty: 'gr', nm: name, it: [...items.filter(Boolean), tr] });
const path = (name, vertices, { closed = false, inTangents, outTangents } = {}) => ({
  ty: 'sh',
  nm: name,
  ks: value({ c: closed, v: vertices, i: inTangents ?? vertices.map(() => [0, 0]), o: outTangents ?? vertices.map(() => [0, 0]) }),
});
const px = (local) => local * R;
/** 多邊形 (直線), 座標以半徑為 1. */
const polygon = (name, points, closed = true) => path(name, points.map(([x, y]) => [px(x), px(y)]), { closed });
/** 圓上的點 (以半徑為 1), 角度 0 在右邊, 順時針 (y 往下). */
const onCircle = (cx, cy, r, degrees) => [cx + r * Math.cos((degrees * Math.PI) / 180), cy + r * Math.sin((degrees * Math.PI) / 180)];
/** 圓弧取樣成多邊形的點, 座標以半徑為 1. */
const arcPoints = (cx, cy, r, from, to, steps = 16) => Array.from({ length: steps + 1 }, (_, index) => onCircle(cx, cy, r, from + ((to - from) * index) / steps));

/** Catmull-Rom 曲線穿過所有的點 (以半徑為 1), 轉成 Lottie 的 bezier; closed 時頭尾相接. */
const smooth = (name, points, closed = true) => {
  const n = points.length;
  const at = (index) => (closed ? points[(index + n) % n] : points[Math.min(n - 1, Math.max(0, index))]);
  const tangent = (index) => {
    const before = at(index - 1);
    const after = at(index + 1);
    return [px((after[0] - before[0]) / 6), px((after[1] - before[1]) / 6)];
  };
  const out = points.map((_, index) => tangent(index));
  return path(name, points.map(([x, y]) => [px(x), px(y)]), { closed, outTangents: out, inTangents: out.map(([x, y]) => [-x, -y]) });
};
/** 帽子的圓頂: 從 y = bottom 的左邊沿著半徑 radius 的圓弧到右邊 (以半徑為 1; 身體是半徑 1 的圓). */
const domePoints = (bottom, radius = 1.05, cy = 0, steps = 20) => {
  const base = (Math.asin((bottom - cy) / radius) * 180) / Math.PI;
  return arcPoints(0, cy, radius, 180 - base, 360 + base, steps);
};
/** 繞著頭一圈的帶子 (頭巾, 帽緣): 上緣 yTop, 下緣 yBottom, 中間往下彎 bulge (看起來有圓弧). */
const bandPoints = (yTop, yBottom, bulge = 0.1, grow = 1.04, steps = 14) => {
  const edge = (y) => Math.sqrt(Math.max(0.01, 1 - y * y)) * grow;
  const line = (y) => Array.from({ length: steps + 1 }, (_, index) => {
    const x = -edge(y) + (2 * edge(y) * index) / steps;
    return [x, y + bulge * (1 - (x / edge(y)) ** 2)];
  });
  return [...line(yTop), ...line(yBottom).reverse()];
};

/** 組出夥伴包. `ability`: { id, name, sleep?, hat?(kit), held?(kit), layers?(kit), frame?(context), star? }. */
export function build(ability, outDir) {
  const { id } = ability;
  const SEGMENT_NAMES = ability.sleep ? SLEEP_SEGMENTS : AWAKE_SEGMENTS;
  const has = (name) => SEGMENT_NAMES.includes(name);

  // --- 時間軸 ---
  const frames = (name) => Math.max(1, Math.round(SEGMENTS[name].seconds * FR));
  const OFFSETS = {};
  let cursor = 0;
  for (const view of VIEWS) {
    for (const name of SEGMENT_NAMES) {
      OFFSETS[`${name}-${view.name}`] = cursor;
      cursor += frames(name) + 1;
    }
  }
  const TOTAL = cursor;

  /** 每個屬性收集 `[frame, 值]`, 最後組成線性的 keyframe. */
  const tracks = new Map();
  const record = (name, frame, number) => {
    if (!tracks.has(name)) tracks.set(name, []);
    tracks.get(name).push([frame, [number].flat().map((item) => Math.round(item * 1000) / 1000)]);
  };
  const LINEAR = { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } };
  function track(name) {
    const keys = tracks.get(name);
    if (!keys) throw new Error(`沒有記錄過的屬性: ${name}`);
    const same = (a, b) => JSON.stringify(a[1]) === JSON.stringify(b[1]);
    const kept = keys.filter((key, index) => index === 0 || index === keys.length - 1 || !same(keys[index - 1], key) || !same(key, keys[index + 1]));
    if (kept.every((key) => same(key, kept[0]))) return { a: 0, k: kept[0][1].length === 1 ? kept[0][1][0] : kept[0][1] };
    return { a: 1, k: kept.map(([t, s], index) => (index < kept.length - 1 ? { t, s, ...LINEAR } : { t, s })) };
  }
  const layer = (name, ind, shapes, ks = {}, extra = {}) => ({
    ty: 4, nm: name, ind, ip: 0, op: TOTAL, st: 0, sr: 1,
    ks: { a: value([0, 0]), p: value([0, 0]), s: value([100, 100]), r: value(0), o: value(100), ...ks },
    shapes, ...extra,
  });
  const kit = {
    R, C, FR, LOOP, COLORS, EDGES, OUTLINE, LIMBS, BEAD_RADIUS,
    hex, span, clamp01, lerp, easeInOut, add, sub, toCanvas,
    px, value, ellipse, fill, stroke, transform, group, path, layer, polygon, smooth, domePoints, bandPoints, onCircle, arcPoints, track,
  };

  // --- 逐 frame 烘焙 ---
  for (const view of VIEWS) {
    const { edge } = view;
    for (const name of SEGMENT_NAMES) {
      const start = OFFSETS[`${name}-${view.name}`];
      for (let frame = 0; frame <= frames(name); frame += 1) {
        const t = Math.min(SEGMENTS[name].seconds, frame / FR);
        const state = SEGMENTS[name].sample(view, t);
        if (ability.sleep) state.sleep = name === 'stillGear' ? 0 : 1 - state.out;
        const shape = pose(edge, state);
        const at = start + frame;
        const side = edge === 'right' ? -1 : 1;
        const values = {
          position: add([C, C], EDGES[edge].dir, state.inset * R),
          turn: EDGES[edge].turn,
          tilt: shape.tilt,
          scale: [shape.sx * 100, shape.sy * 100],
          bodyShift: shape.shift,
          eyeShift: [shape.eyeDx * R, FACE.eye.y * R],
          eyeScale: [100, shape.eyeOpen * 100],
          eyes: state.inhaling ? 0 : 100,
          squint: state.inhaling ? 100 : 0,
          mouthOpen: state.open > 0.05 ? 100 : 0,
          mouthSize: [0.34 * state.open * R, 0.44 * state.open * R],
          smile: state.open > 0.05 ? 0 : 100,
          armLeft: [-LIMBS.arm.x * R, EDGES[edge].armY * R],
          armRight: [LIMBS.arm.x * R, EDGES[edge].armY * R],
          hand: [side * LIMBS.arm.x * R, EDGES[edge].armY * R],
        };
        const star = state.star;
        values.starPosition = star ? star.at : [0, 0];
        values.starScale = star ? [star.size * 100, star.size * 100] : [0, 0];
        values.starSpin = star ? star.spin : 0;
        for (let index = 0; index < SPIT.sparkles; index += 1) {
          const sparkle = state.sparkles[index];
          values[`sparkle${index}Position`] = sparkle ? sparkle.at : [0, 0];
          values[`sparkle${index}Scale`] = sparkle ? [sparkle.size * 100, sparkle.size * 100] : [0, 0];
        }
        const gear = state.gear;
        values.gearPosition = gear ? gear.at : [0, 0];
        values.gearScale = gear ? [gear.scale * 100, gear.scale * 100] : [0, 0];
        values.gearSpin = gear ? gear.spin : 0;
        for (let index = 0; index < INHALE.lines; index += 1) {
          const line = state.lines[index];
          values[`line${index}Position`] = line ? toCanvas(edge, line.to) : [C, C];
          values[`line${index}Angle`] = line ? (line.angle * 180) / Math.PI + EDGES[edge].turn : 0;
          values[`line${index}Opacity`] = line ? 85 * line.opacity : 0;
        }
        if (ability.sleep) {
          // 趴下時閉眼, 嘴巴是一個隨呼吸脹縮的小圓; 醒來時換回夥伴K的臉.
          const asleep = clamp01((state.sleep - 0.2) / 0.4);
          const breath = Math.sin((2 * Math.PI * state.time) / BREATH.period);
          values.eyes *= 1 - asleep;
          values.sleepEyes = 100 * asleep * (state.inhaling ? 0 : 1);
          values.mouthSize = values.mouthSize.map((size, index) => lerp(size, [0.12, 0.17][index] * R * (1 + 0.3 * breath), asleep));
          values.mouthOpen = asleep > 0.5 ? 100 : values.mouthOpen;
          values.smile = asleep > 0.5 ? 0 : values.smile;
        }
        ability.frame?.({ view, edge, side, name, t, state, shape, values, kit });
        for (const [key, number] of Object.entries(values)) record(key, at, number);
      }
    }
  }

  // --- 圖層 ---
  const eyes = [-1, 1].map((sign) => {
    const x = px(sign * FACE.eye.x);
    const y = px(FACE.eye.y);
    return group(`eye ${sign}`, [
      group('shine', [ellipse('shine', [x, y - px(FACE.eye.ry * 0.45)], [px(FACE.eye.rx * 1.2), px(FACE.eye.ry * 0.6)]), fill(COLORS.shine)]),
      group('iris', [ellipse('iris', [x, y + px(FACE.eye.ry * 0.5)], [px(FACE.eye.rx * 1.2), px(FACE.eye.ry * 0.64)]), fill(COLORS.iris)]),
      group('eye', [ellipse('eye', [x, y], [px(FACE.eye.rx * 2), px(FACE.eye.ry * 2)]), fill(COLORS.eye)]),
    ]);
  });
  const squints = [-1, 1].map((sign) => {
    const x = px(FACE.eye.x);
    const y = px(FACE.eye.y);
    return group(`squint ${sign}`, [
      path('squint', [[sign * (x + px(0.1)), y - px(0.12)], [sign * (x - px(0.04)), y], [sign * (x + px(0.1)), y + px(0.12)]]),
      stroke(COLORS.eye, px(0.07)),
    ]);
  });
  /** 睡著的眼睛: 往上彎的細線, 兩眼的間距比醒著時寬. */
  const sleepEyes = ability.sleep
    ? [-1, 1].map((sign) => {
        const x = px(sign * 0.3);
        const y = px(FACE.eye.y + 0.1);
        const half = px(0.2);
        return group(`sleep eye ${sign}`, [
          path('sleep eye', [[x - half, y], [x + half, y]], { outTangents: [[(2 / 3) * half, -(2 / 3) * px(0.05)], [0, 0]], inTangents: [[0, 0], [(-2 / 3) * half, -(2 / 3) * px(0.05)]] }),
          stroke(COLORS.eye, px(0.065)),
        ]);
      })
    : null;
  const smileWidth = px(FACE.mouth.width);
  const smileY = px(FACE.mouth.y);
  const smileDepth = px(FACE.mouth.depth);
  const face = group('face', [
    group('eyes', eyes, transform({ p: track('eyeShift'), a: value([0, px(FACE.eye.y)]), s: track('eyeScale'), o: track('eyes') })),
    group('squint', squints, transform({ o: track('squint') })),
    sleepEyes && group('sleep eyes', sleepEyes, transform({ o: track('sleepEyes') })),
    group('mouth open', [ellipse('mouth', [0, smileY + px(0.04)], track('mouthSize')), stroke(COLORS.mouth, px(OUTLINE)), fill(COLORS.mouthInside)], transform({ o: track('mouthOpen') })),
    group(
      'smile',
      [
        path('smile', [[-smileWidth, smileY], [smileWidth, smileY]], {
          outTangents: [[(2 / 3) * smileWidth, (2 / 3) * smileDepth], [0, 0]],
          inTangents: [[0, 0], [(-2 / 3) * smileWidth, (2 / 3) * smileDepth]],
        }),
        stroke(COLORS.mouth, px(OUTLINE)),
      ],
      transform({ o: track('smile') }),
    ),
    group('blush', [
      ellipse('blush left', [px(-FACE.blush.x), px(FACE.blush.y)], [px(FACE.blush.rx * 2), px(FACE.blush.ry * 2)]),
      ellipse('blush right', [px(FACE.blush.x), px(FACE.blush.y)], [px(FACE.blush.rx * 2), px(FACE.blush.ry * 2)]),
      fill(COLORS.blush),
    ], transform({ o: value(80) })),
  ], ability.sleep ? transform({ p: track('faceShift'), s: track('faceScale') }) : undefined);
  const body = group('body', [ellipse('body', [0, 0], [2 * R, 2 * R]), stroke(COLORS.outline, px(OUTLINE)), fill(COLORS.body)]);
  const arms = [['armLeft', -1], ['armRight', 1]].map(([name, sign]) =>
    group(`arm ${sign}`, [ellipse('arm', [0, 0], [px(2 * LIMBS.arm.r), px(2 * LIMBS.arm.r)]), stroke(COLORS.outline, px(OUTLINE)), fill(COLORS.body)], transform({ p: track(name) })),
  );
  const feet = [-1, 1].map((sign) =>
    group(
      `foot ${sign}`,
      [ellipse('foot', [0, 0], [px(2 * LIMBS.foot.rx), px(2 * LIMBS.foot.ry)]), stroke(COLORS.outline, px(OUTLINE)), fill(COLORS.foot)],
      ability.sleep
        ? transform({ p: track(`foot${sign}Position`), s: track(`foot${sign}Scale`), r: track(`foot${sign}Rotation`) })
        : transform({ p: value([px(sign * LIMBS.foot.x), px(LIMBS.foot.y)]), r: value(sign * LIMBS.foot.tilt) }),
    ),
  );
  // 手握著武器: 手 (與夥伴K的手相同) 畫在武器上面. 拿武器的是畫面看得到的那一隻手.
  const hand = ability.held
    ? group('hand', [ellipse('hand', [0, 0], [px(2 * LIMBS.arm.r), px(2 * LIMBS.arm.r)]), stroke(COLORS.outline, px(OUTLINE)), fill(COLORS.body)], transform(ability.sleep ? { p: track('hand'), s: track('handScale'), o: track('handOpacity') } : { p: track('hand') }))
    : null;
  // 睡眠能力側躺時, 帽子要斜著蓋在背上, 不能跟著壓扁的身體變形, 所以畫在身體的外面 (醒來時 hatShift 與 hatScale 與身體相同).
  const hatItems = ability.hat?.(kit) ?? [];
  const hat = ability.sleep ? [] : hatItems;
  const hatOuter = ability.sleep ? [group('hat', hatItems, transform({ p: track('hatShift'), r: track('hatRot'), s: track('hatScale') }))] : [];
  // 變形的順序與原本相同: 位置 → 倒掛 → 以身體下方的點歪頭 → 伸縮. 腳與手畫在身體後面; 帽子與武器畫在最前面.
  const character = layer('companion', 6, [
    group(
      'pose',
      [
        group(
          'tilt',
          [...(ability.outer?.(kit) ?? []), ...hatOuter, group('body', [hand, ...(ability.held?.(kit) ?? []), ...hat, face, body, ...arms, ...feet], transform({ s: track('scale'), p: track('bodyShift') }))],
          transform({ p: value([0, px(TILT.pivot)]), a: value([0, px(TILT.pivot)]), r: track('tilt') }),
        ),
      ],
      transform({ p: track('position'), r: track('turn') }),
    ),
  ]);

  const starColors = { fill: COLORS.star, outline: COLORS.starOutline, ...ability.star };
  const STAR = Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? 1 : 0.45;
    const angle = (index * Math.PI) / 5 - Math.PI / 2;
    return [radius * Math.cos(angle) * GEAR.radius, radius * Math.sin(angle) * GEAR.radius];
  });
  /** 齒輪的原點: app 寫入的 `gear` slot; 星星, 小星星與齒輪都以它為 parent. */
  const anchor = { ty: 3, nm: 'gear anchor', ind: 1, ip: 0, op: TOTAL, st: 0, sr: 1, ks: { a: value([0, 0]), p: { a: 0, k: [200, 40], sid: 'gear' }, s: value([100, 100]), r: value(0), o: value(100) } };
  const starLayer = layer('star', 2, [group('star', [path('star', STAR, { closed: true }), stroke(starColors.outline, 0.12 * GEAR.radius), fill(starColors.fill)])], {
    p: track('starPosition'), s: track('starScale'), r: track('starSpin'),
  }, { parent: 1 });
  const sparkles = layer('sparkles', 3, Array.from({ length: SPIT.sparkles }, (_, index) =>
    group(`sparkle ${index}`, [path('star', STAR, { closed: true }), fill(starColors.fill)], transform({ p: track(`sparkle${index}Position`), s: track(`sparkle${index}Scale`) })),
  ), {}, { parent: 1 });
  /** 落地後的齒輪: 與史萊姆的齒輪相同, 圓加上粗虛線的齒與軸 (史萊姆預設的黑色與白色). */
  const teeth = GEAR.radius * 0.5;
  const dash = (2 * Math.PI * teeth) / 16;
  const gearLayer = layer('gear', 4, [
    group('hub', [ellipse('hub', [0, 0], [GEAR.radius * 0.64, GEAR.radius * 0.64]), stroke(COLORS.gearInk, GEAR.radius * 0.16)]),
    group('teeth', [ellipse('teeth', [0, 0], [2 * teeth, 2 * teeth]), stroke(COLORS.gearInk, GEAR.radius * 0.3, { lc: 1, d: [{ n: 'd', nm: 'dash', v: value(dash) }, { n: 'g', nm: 'gap', v: value(dash) }] })]),
    group('disc', [ellipse('disc', [0, 0], [2 * GEAR.radius, 2 * GEAR.radius]), fill(COLORS.gearFill)]),
  ], { p: track('gearPosition'), s: track('gearScale'), r: track('gearSpin') }, { parent: 1 });
  const lines = layer('inhale', 5, Array.from({ length: INHALE.lines }, (_, index) =>
    group(`line ${index}`, [path('line', [[0, 0], [px(INHALE.length), 0]]), stroke(COLORS.gearInk, px(0.08))], transform({ p: track(`line${index}Position`), r: track(`line${index}Angle`), o: track(`line${index}Opacity`) })),
  ));

  const markers = Object.entries(OFFSETS).map(([name, tm]) => ({ cm: name, tm, dr: frames(name.split('-')[0]) }));
  const animation = {
    v: '5.12.0', fr: FR, ip: 0, op: TOTAL, w: 2 * CANVAS, h: 2 * CANVAS, nm: ability.name, ddd: 0, assets: [], markers,
    slots: { gear: { p: value([200, 40]) } },
    layers: [anchor, starLayer, sparkles, gearLayer, lines, ...(ability.layers?.(kit) ?? []), character],
  };

  // --- state machine ---
  const guard = (type, inputName, conditionType, compareTo) => ({ type, inputName, conditionType, compareTo });
  const to = (toState, ...guards) => ({ type: 'Transition', toState, guards });
  const set = (inputName, number) => ({ type: 'SetNumeric', inputName, value: number });
  const hovering = (on) => guard('Boolean', 'hovering', 'Equal', on);
  const reduced = (on) => guard('Boolean', 'reducedMotion', 'Equal', on);
  const step = guard('Numeric', 'step', 'Equal', 1);
  const budAtLeast = guard('Numeric', 'bud', 'GreaterThanOrEqual', 0.2);
  const budBelow = guard('Numeric', 'bud', 'LessThan', 0.2);
  const rollBelow = (limit) => guard('Numeric', 'roll', 'LessThan', limit);

  function playback(segment, viewName, { loop = false, autoplay = true, transitions = [], entry = [] } = {}) {
    return {
      name: `${segment}-${viewName}`, type: 'PlaybackState', animation: id, segment: `${segment}-${viewName}`,
      loop, autoplay, entryActions: [set('step', 0), ...entry], transitions,
    };
  }
  /** 換邊或換方向: 停著的 state 換成 `edge` 與 `along` 都相符的那一組. */
  const moveView = (viewName, segment) =>
    VIEWS.filter((other) => other.name !== viewName).map((other) =>
      to(`${segment}-${other.name}`, guard('String', 'edge', 'Equal', other.edge), guard('String', 'along', 'Equal', other.along)),
    );
  const acting = (viewName, next) => ({
    entry: [set('roll', 1)],
    transitions: [to(`still-${viewName}`, reduced(true)), to(`open-${viewName}`, hovering(true)), ...moveView(viewName, 'idle'), to(next, step)],
  });

  /**
   * 每 2.8 秒抽一次: 約一半的機會做一個動作 (原本間隔 2.5 到 6 秒); 比例與原本相同: 眨眼 35% (其中 30% 眨兩下),
   * 往旁邊看 25%, 縮回 20%, 偷看 20%. 睡眠能力只有打呼泡泡.
   */
  const CHANCE = 0.5;
  const cumulative = ability.sleep
    ? [['snore', 1]]
    : [['blink', 0.35 * 0.7], ['blink2', 0.35 * 0.3], ['glanceL', 0.125], ['glanceR', 0.125], ['duck', 0.2], ['peekA', 0.1], ['peekB', 0.1]];
  let sum = 0;
  const draws = cumulative.map(([name, share]) => {
    sum += share * CHANCE;
    return [name, Math.round(sum * 10000) / 10000];
  });

  const quick = ['blink', 'blink2', 'glanceL', 'glanceR', 'peekA', 'peekB', 'snore'].filter(has);
  const states = VIEWS.map((view) => view.name).flatMap((viewName) => [
    playback('idle', viewName, {
      loop: true,
      transitions: [
        to(`still-${viewName}`, reduced(true)),
        to(`open-${viewName}`, hovering(true)),
        ...moveView(viewName, 'idle'),
        ...draws.map(([name, limit]) => to(`${name}-${viewName}`, rollBelow(limit))),
      ],
    }),
    ...quick.map((name) => playback(name, viewName, acting(viewName, `idle-${viewName}`))),
    ...(has('duck')
      ? [
          playback('duck', viewName, acting(viewName, `pop-${viewName}`)),
          playback('pop', viewName, { transitions: [to(`still-${viewName}`, reduced(true)), to(`open-${viewName}`, hovering(true)), ...moveView(viewName, 'idle'), to(`idle-${viewName}`, step)] }),
        ]
      : []),
    playback('open', viewName, { transitions: [to(`still-${viewName}`, reduced(true)), to(`idle-${viewName}`, hovering(false)), to(`spit-${viewName}`, budAtLeast)] }),
    playback('spit', viewName, { transitions: [to(`still-${viewName}`, reduced(true)), to(`gulp-${viewName}`, hovering(false)), to(`hold-${viewName}`, step)] }),
    playback('hold', viewName, { loop: true, transitions: [to(`still-${viewName}`, reduced(true)), to(`gulp-${viewName}`, hovering(false))] }),
    playback('gulp', viewName, { transitions: [to(`still-${viewName}`, reduced(true)), to(`spit-${viewName}`, hovering(true), budAtLeast), to(`idle-${viewName}`, step)] }),
    playback('still', viewName, { autoplay: false, transitions: [to(`idle-${viewName}`, reduced(false)), ...moveView(viewName, 'still'), to(`stillGear-${viewName}`, hovering(true), budAtLeast)] }),
    playback('stillGear', viewName, { autoplay: false, transitions: [to(`idle-${viewName}`, reduced(false)), to(`still-${viewName}`, budBelow)] }),
  ]);
  const completes = ['blink', 'blink2', 'glanceL', 'glanceR', 'duck', 'pop', 'peekA', 'peekB', 'snore', 'spit', 'gulp'].filter(has);
  const interactions = VIEWS.map((view) => view.name).flatMap((viewName) => [
    { type: 'OnLoopComplete', stateName: `idle-${viewName}`, actions: [{ type: 'SetRandom', inputName: 'roll', min: 0, max: 1 }] },
    ...completes.map((name) => ({ type: 'OnComplete', stateName: `${name}-${viewName}`, actions: [set('step', 1)] })),
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
      { type: 'Numeric', name: 'roll', value: 1 },
      { type: 'Numeric', name: 'step', value: 0 },
    ],
    interactions,
    states,
  };

  const manifest = {
    format: 1,
    id,
    name: ability.name,
    author: 'seanmars',
    radius: R,
    canvas: CANVAS,
    gap: GAP,
    lean: LEAN,
    gear: GEAR,
    jiggle: { stiffness: 260, damping: 7, thin: JIGGLE_THIN, appear: 2.8, hide: -1.8, spit: -2.6, gulp: 2.2 },
    kicks: has('duck') ? Object.fromEntries(VIEWS.flatMap((view) => [[`duck-${view.name}`, -1.8], [`pop-${view.name}`, 2.8]])) : {},
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'animation.json'), `${JSON.stringify(animation)}\n`);
  writeFileSync(join(outDir, 'state-machine.json'), `${JSON.stringify(stateMachine, null, 2)}\n`);
  writeFileSync(join(outDir, 'companion.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`wrote ${outDir}: ${TOTAL} frames, open ${OPEN_SECONDS.toFixed(3)}s, spit ${SPIT_SECONDS.toFixed(3)}s`);
}
