/**
 * Puppet rig for the animated logo (AnimatedLogo.jsx).
 *
 * Each dog is a fine mesh over its own pixels from the logo, bent by a small
 * skeleton (legs, body, neck, head, tail) with smooth skinning, so heads lift,
 * bodies lean and tails whip while the feet stay planted. Nothing is redrawn
 * and nothing is flipped. The one addition is the Labrador's tail, which the
 * logo doesn't show: at rest it is tucked entirely behind the Lab's body
 * (checked pixel by pixel), so the still logo is unchanged, and it swings
 * out only while wagging.
 *
 * Coordinates are logo pixels (the PNGs are 1396 × 564). Angles are degrees.
 * Pose values are "pitch": positive lifts a head or tail / leans a body back,
 * whichever way the dog faces.
 */

export const LOGO_W = 1396;
export const LOGO_H = 564;
/** The lettering starts after this column. */
export const WORDS_X = 577;

export const DOGS = {
  golden: {
    facing: 1, // faces left
    bones: {
      root: { parent: null, pivot: [190, 495] },
      base: { parent: "root", pivot: [190, 495], segs: [[[270, 410], [150, 490]], [[270, 410], [322, 452]]] },
      torso: { parent: "root", pivot: [270, 410], segs: [[[270, 410], [150, 250]]] },
      neck: { parent: "torso", pivot: [150, 250], segs: [[[150, 250], [140, 185]]] },
      head: { parent: "neck", pivot: [140, 185], segs: [[[140, 185], [60, 140]], [[140, 185], [195, 205]]] },
      tail1: { parent: "root", pivot: [318, 465], segs: [[[318, 465], [360, 482]]], tail: true },
      tail2: { parent: "tail1", pivot: [360, 482], segs: [[[360, 482], [398, 490]]], tail: true },
    },
    muzzle: [60, 140],
    /** Pixels right of / below these belong to the tail. */
    tailZone: { x0: 318, x1: 334, y0: 446, y1: 458 },
  },
  lab: {
    facing: -1, // faces right
    bones: {
      root: { parent: null, pivot: [440, 495] },
      base: { parent: "root", pivot: [440, 495], segs: [[[370, 410], [500, 490]], [[370, 410], [330, 470]]] },
      torso: { parent: "root", pivot: [370, 410], segs: [[[370, 410], [475, 245]]] },
      neck: { parent: "torso", pivot: [475, 245], segs: [[[475, 245], [480, 185]]] },
      head: { parent: "neck", pivot: [480, 185], segs: [[[480, 185], [566, 134]], [[480, 185], [440, 200]]] },
    },
    muzzle: [566, 134],
  },
};

/** The Labrador's tail: tucked inside the body at rest (pointing up and right). */
export const LAB_TAIL = { base: [345, 455], length: 80, angle: -30, width: [9, 2.6], segments: 14 };

// ---------- small math ----------

/** Affine [a, b, c, d, e, f]: x' = a x + c y + e, y' = b x + d y + f. */
const IDENTITY = [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
function about([px, py], deg, sx = 1, sy = 1, tx = 0, ty = 0) {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  // translate(t) · translate(p) · rotate · scale · translate(-p)
  const a = c * sx, b = s * sx, cc = -s * sy, d = c * sy;
  return [a, b, cc, d, px - a * px - cc * py + tx, py - b * px - d * py + ty];
}

function distToSeg([x, y], [[x1, y1], [x2, y2]]) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// ---------- meshes ----------

/**
 * A grid mesh over the visible pixels of a layer.
 * @param {Uint8ClampedArray} alpha  one byte per logo pixel (W × H)
 * @returns {{ rest: Float32Array, uv: Float32Array, index: Uint16Array }}
 */
export function gridMesh(alpha, cell = 10) {
  const cols = Math.ceil(LOGO_W / cell);
  const rows = Math.ceil(LOGO_H / cell);
  const used = new Uint8Array(cols * rows);
  for (let y = 0; y < LOGO_H; y += 1) {
    for (let x = 0; x < LOGO_W; x += 1) {
      if (alpha[y * LOGO_W + x]) used[Math.floor(y / cell) * cols + Math.floor(x / cell)] = 1;
    }
  }
  const ids = new Map();
  const rest = [];
  const vertex = (cx, cy) => {
    const key = cy * (cols + 1) + cx;
    if (!ids.has(key)) {
      ids.set(key, rest.length / 2);
      rest.push(Math.min(cx * cell, LOGO_W), Math.min(cy * cell, LOGO_H));
    }
    return ids.get(key);
  };
  const index = [];
  for (let cy = 0; cy < rows; cy += 1) {
    for (let cx = 0; cx < cols; cx += 1) {
      if (!used[cy * cols + cx]) continue;
      const a = vertex(cx, cy), b = vertex(cx + 1, cy), c = vertex(cx, cy + 1), d = vertex(cx + 1, cy + 1);
      index.push(a, b, c, b, d, c);
    }
  }
  return finish(rest, index);
}

/** A strip mesh around the Labrador's tail centreline. */
export function tailMesh() {
  const { base, length, angle, width, segments } = LAB_TAIL;
  const r = (angle * Math.PI) / 180;
  const dir = [Math.cos(r), Math.sin(r)];
  const nrm = [-dir[1], dir[0]];
  const rest = [];
  const along = [];
  for (let i = 0; i <= segments; i += 1) {
    const s = i / segments;
    const half = width[0] * (1 - s) + width[1] * s + 3; // + margin for the soft edge
    const cx = base[0] + dir[0] * length * (s * 1.06 - 0.04);
    const cy = base[1] + dir[1] * length * (s * 1.06 - 0.04);
    rest.push(cx + nrm[0] * half, cy + nrm[1] * half, cx - nrm[0] * half, cy - nrm[1] * half);
    along.push(s, s);
  }
  const index = [];
  for (let i = 0; i < segments; i += 1) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const mesh = finish(rest, index);
  mesh.along = Float32Array.from(along);
  return mesh;
}

function finish(rest, index) {
  const r = Float32Array.from(rest);
  const uv = new Float32Array(r.length);
  for (let i = 0; i < r.length; i += 2) {
    uv[i] = r[i] / LOGO_W;
    uv[i + 1] = r[i + 1] / LOGO_H;
  }
  return { rest: r, uv, index: Uint16Array.from(index) };
}

/** Draws the Labrador's tail at rest into a logo-sized 2D canvas, in the Lab's colour. */
export function drawLabTail(ctx, colour) {
  const { base, length, angle, width } = LAB_TAIL;
  const r = (angle * Math.PI) / 180;
  ctx.save();
  ctx.translate(base[0], base[1]);
  ctx.rotate(r);
  ctx.fillStyle = colour;
  ctx.beginPath();
  // An otter tail: thick at the root, tapering, with a slightly rounded tip.
  ctx.moveTo(-3, -width[0]);
  ctx.bezierCurveTo(length * 0.35, -width[0] * 0.95, length * 0.75, -width[1] * 1.6, length, -width[1] * 0.4);
  ctx.quadraticCurveTo(length + width[1] * 1.2, 0, length, width[1] * 0.4);
  ctx.bezierCurveTo(length * 0.75, width[1] * 1.6, length * 0.35, width[0] * 0.95, -3, width[0]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------- skinning ----------

const BONE_ORDER = ["root", "base", "torso", "neck", "head", "tail1", "tail2"];

/** Per-vertex bone weights (up to the dog's bone count), from distance to each bone. */
export function weightsFor(dogKey, rest) {
  const dog = DOGS[dogKey];
  const names = BONE_ORDER.filter((n) => dog.bones[n]?.segs);
  const count = rest.length / 2;
  const w = new Float32Array(count * names.length);
  for (let v = 0; v < count; v += 1) {
    const p = [rest[v * 2], rest[v * 2 + 1]];
    let tailShare = 0;
    if (dog.tailZone) {
      const z = dog.tailZone;
      tailShare = smooth(z.x0, z.x1, p[0]) * smooth(z.y0, z.y1, p[1]);
    }
    let bodySum = 0;
    let tailSum = 0;
    const raw = names.map((n) => {
      const d = Math.min(...dog.bones[n].segs.map((s) => distToSeg(p, s)));
      const value = 1 / (d + 6) ** 4;
      if (dog.bones[n].tail) tailSum += value;
      else bodySum += value;
      return value;
    });
    names.forEach((n, i) => {
      const isTail = Boolean(dog.bones[n].tail);
      const share = isTail ? tailShare : 1 - tailShare;
      const sum = isTail ? tailSum : bodySum;
      w[v * names.length + i] = sum ? (raw[i] / sum) * share : 0;
    });
  }
  return { names, w };
}

/** World matrices for one dog's bones from a pose. */
export function boneMatrices(dogKey, pose = {}) {
  const dog = DOGS[dogKey];
  const f = dog.facing;
  const out = {};
  for (const name of BONE_ORDER) {
    const bone = dog.bones[name];
    if (!bone) continue;
    const p = pose[name] || {};
    // Pitch convention: positive lifts the head / leans back. Tails point
    // backwards, so "up" turns the other way.
    const deg = (bone.tail ? -f : f) * (p.pitch || 0);
    const local = name === "root"
      ? about(bone.pivot, deg, p.sx ?? 1, p.sy ?? 1, p.x || 0, p.y || 0)
      : about(bone.pivot, deg);
    out[name] = bone.parent ? mul(out[bone.parent], local) : local;
  }
  return out;
}

/** Skins rest positions into `target` with linear blend skinning. */
export function skin(target, rest, weights, matrices) {
  const { names, w } = weights;
  const mats = names.map((n) => matrices[n]);
  const k = names.length;
  for (let v = 0, n = rest.length / 2; v < n; v += 1) {
    const x = rest[v * 2];
    const y = rest[v * 2 + 1];
    let ox = 0;
    let oy = 0;
    for (let i = 0; i < k; i += 1) {
      const wi = w[v * k + i];
      if (!wi) continue;
      const m = mats[i];
      ox += wi * (m[0] * x + m[2] * y + m[4]);
      oy += wi * (m[1] * x + m[3] * y + m[5]);
    }
    target[v * 2] = ox;
    target[v * 2 + 1] = oy;
  }
}

/** The Labrador's tail: two joints along the strip, carried by the Lab's body. */
export function skinLabTail(target, mesh, labMatrices, swing = 0, bend = 0) {
  const { base, length, angle } = LAB_TAIL;
  const r = (angle * Math.PI) / 180;
  const mid = [base[0] + Math.cos(r) * length * 0.5, base[1] + Math.sin(r) * length * 0.5];
  const t1 = mul(labMatrices.base, about(base, swing));
  const t2 = mul(t1, about(mid, bend));
  for (let v = 0, n = mesh.rest.length / 2; v < n; v += 1) {
    const s = mesh.along[v];
    const k = smooth(0.25, 0.75, s);
    const p = [mesh.rest[v * 2], mesh.rest[v * 2 + 1]];
    const a = apply(t1, p);
    const b = apply(t2, p);
    target[v * 2] = a[0] * (1 - k) + b[0] * k;
    target[v * 2 + 1] = a[1] * (1 - k) + b[1] * k;
  }
}

export const muzzleAt = (dogKey, matrices) => apply(matrices.head, DOGS[dogKey].muzzle);

// ---------- motion ----------

/** 0 → 1 between a and b, 1 → 0 between c and d, smoothly; exactly 0 outside. */
const env = (t, a, b, c, d) => (t <= a || t >= d ? 0 : t < b ? smooth(a, b, t) : t > c ? 1 - smooth(c, d, t) : 1);
/** A quick kick that settles like a spring: 0 before t0. */
const kick = (t, t0, freq = 3.2, damp = 6.5) => (t < t0 ? 0 : Math.exp(-damp * (t - t0)) * Math.sin(2 * Math.PI * freq * (t - t0)));
const wave = (t, freq, phase = 0) => Math.sin(2 * Math.PI * freq * t + phase);

/**
 * Each trick: duration (s) and pose(t) → { golden, lab, labTail: {swing, bend}, hearts: [{ from, t0 }] }.
 * Every pose is exactly at rest at t = 0 and t = duration.
 */
export const TRICKS = {
  bark: {
    duration: 2.6,
    hearts: (who) => [{ from: who, t0: 0.34 }, { from: who, t0: 0.92, small: true }],
    pose(t, who = "golden") {
      const on = env(t, 0, 0.12, 2.0, 2.6);
      const other = who === "golden" ? "lab" : "golden";
      const woof = kick(t, 0.3) + 0.8 * kick(t, 0.88);
      const barker = {
        torso: { pitch: on * (1.4 * env(t, 0, 0.22, 0.26, 0.4) - 3.2 * woof) },
        neck: { pitch: on * (2.5 * woof) },
        head: { pitch: on * (-3 * env(t, 0, 0.2, 0.26, 0.36) + 9 * woof) },
        root: { sy: 1 + 0.012 * woof * on },
      };
      const listener = {
        neck: { pitch: 2 * env(t, 0.4, 0.75, 1.7, 2.3) },
        head: { pitch: 4 * env(t, 0.38, 0.7, 1.6, 2.3) + 0.8 * kick(t, 0.5, 2.2, 4) * env(t, 0.38, 0.5, 1.6, 2.3) },
      };
      return { [who]: barker, [other]: listener, labTail: { swing: 0, bend: 0 } };
    },
  },

  wag: {
    duration: 3.4,
    pose(t) {
      const g = env(t, 0, 0.25, 2.8, 3.4);
      const out = env(t, 0.05, 0.55, 2.75, 3.3); // Lab's tail out from behind
      const w = env(t, 0.4, 0.7, 2.5, 2.9);
      return {
        golden: {
          tail1: { pitch: g * (9 + 9 * wave(t, 3.1)) },
          tail2: { pitch: g * 12 * wave(t, 3.1, -1.1) },
          torso: { pitch: g * 0.7 * wave(t, 1.55) },
          head: { pitch: g * (1.5 + 1.2 * wave(t, 1.55, 0.6)) },
        },
        lab: {
          torso: { pitch: w * 0.8 * wave(t, 1.5, 1.2) },
          head: { pitch: g * (2 + 1 * wave(t, 1.5, 1.8)) },
        },
        labTail: {
          swing: -142 * out + w * 17 * wave(t - 0.4, 2.9),
          bend: w * 15 * wave(t - 0.4, 2.9, -1.2) - 8 * out,
        },
      };
    },
  },

  sniff: {
    duration: 3,
    pose(t) {
      const dog = (d) => {
        const up = env(t, d, d + 0.5, 1.9 + d, 2.6 + d * 0.6);
        const sniffs = env(t, d + 0.5, d + 0.62, 1.6 + d, 1.8 + d);
        return {
          torso: { pitch: up * 1 },
          neck: { pitch: up * 3 },
          head: { pitch: up * 9 + sniffs * 1.5 * wave(t, 6.5) },
        };
      };
      return { golden: dog(0), lab: dog(0.25), labTail: { swing: 0, bend: 0 } };
    },
  },

  lean: {
    duration: 3.6,
    hearts: () => [{ between: true, t0: 1.1 }],
    pose(t) {
      const lean = env(t, 0, 0.8, 2.5, 3.5);
      const settle = kick(t, 0.8, 1.6, 3) * env(t, 0.8, 0.9, 2.3, 2.8);
      const dog = (k) => ({
        torso: { pitch: lean * (6.5 + 0.6 * settle) * k },
        neck: { pitch: -lean * 2 },
        head: { pitch: -lean * 3.5 },
      });
      return { golden: dog(1), lab: dog(1), labTail: { swing: 0, bend: 0 } };
    },
  },
};
