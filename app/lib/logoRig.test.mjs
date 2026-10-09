import test from "node:test";
import assert from "node:assert/strict";
import { LOGO_H, LOGO_W, TRICKS, boneMatrices, gridMesh, skin, skinLabTail, tailMesh, weightsFor } from "./logoRig.mjs";

// A blob of "pixels" where each dog sits, enough to build meshes.
function blob(x0, x1, y0, y1) {
  const a = new Uint8ClampedArray(LOGO_W * LOGO_H);
  for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) a[y * LOGO_W + x] = 255;
  return a;
}

test("every trick starts and ends exactly at rest, so the swap is invisible", () => {
  for (const [name, trick] of Object.entries(TRICKS)) {
    for (const t of [0, trick.duration]) {
      const pose = trick.pose(t, "golden");
      for (const dog of ["golden", "lab"]) {
        for (const [bone, p] of Object.entries(pose[dog] || {})) {
          for (const [k, v] of Object.entries(p)) {
            const rest = k === "sx" || k === "sy" ? 1 : 0;
            assert.ok(Math.abs(v - rest) < 1e-9, `${name} ${dog}.${bone}.${k} = ${v} at t=${t}`);
          }
        }
      }
      assert.ok(Math.abs(pose.labTail?.swing || 0) < 1e-9 && Math.abs(pose.labTail?.bend || 0) < 1e-9, `${name} lab tail at rest at t=${t}`);
    }
  }
});

test("the rest pose leaves every vertex exactly where it was", () => {
  for (const [dog, area] of [["golden", [53, 400, 95, 500]], ["lab", [312, 576, 100, 500]]]) {
    const mesh = gridMesh(blob(...area));
    const out = new Float32Array(mesh.rest.length);
    skin(out, mesh.rest, weightsFor(dog, mesh.rest), boneMatrices(dog, {}));
    for (let i = 0; i < out.length; i += 1) assert.ok(Math.abs(out[i] - mesh.rest[i]) < 1e-3, `${dog} vertex ${i}`);
  }
  const tail = tailMesh();
  const out = new Float32Array(tail.rest.length);
  skinLabTail(out, tail, boneMatrices("lab", {}), 0, 0);
  for (let i = 0; i < out.length; i += 1) assert.ok(Math.abs(out[i] - tail.rest[i]) < 1e-3);
});

test("a raised head moves the muzzle up and keeps the feet planted", () => {
  const m = boneMatrices("golden", { head: { pitch: 10 } });
  const [, y] = [m.head[1] * 60 + m.head[3] * 140 + m.head[5]];
  assert.ok(m.head[1] * 60 + m.head[3] * 140 + m.head[5] < 140, `muzzle y ${y}`);
  const feet = m.base;
  assert.ok(Math.abs(feet[0] * 190 + feet[2] * 495 + feet[4] - 190) < 1e-9);
});
