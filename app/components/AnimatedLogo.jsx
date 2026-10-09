"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LOGO_H, LOGO_W, TRICKS, WORDS_X,
  boneMatrices, drawLabTail, gridMesh, muzzleAt, skin, skinLabTail, tailMesh, weightsFor,
} from "../lib/logoRig.mjs";

/**
 * The logo, with a small moment every 15–25 minutes: a dog barks a heart,
 * both wag their tails, they sniff the air, or they lean on each other.
 *
 * - The static logo is what shows. During a trick it is swapped, in a single
 *   frame, for a copy: the same image clipped to the lettering, plus the two
 *   dogs drawn with WebGL. The dogs are composed at the logo's own resolution
 *   and area-filtered down to the screen's real pixels, so at rest they match
 *   the static image to within anti-aliasing. It swaps back once everything
 *   is at rest again.
 * - The dogs move as puppets of their own pixels (app/lib/logoRig.mjs):
 *   nothing is redrawn or flipped, and the lettering never moves. The Lab's
 *   tail stays tucked out of sight unless it's wagging.
 * - prefers-reduced-motion: nothing plays. `?logo-fun` plays every trick in
 *   turn, for review; `?logo-fun=still` swaps to the copy at rest and stays,
 *   to check it matches the static logo.
 */

const MIN_WAIT = 15 * 60 * 1000;
const MAX_WAIT = 25 * 60 * 1000;
const ORDER = ["wag", "bark", "sniff", "lean"];
const randomWait = () => MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT);
const isDemo = () => new URLSearchParams(window.location.search).has("logo-fun");
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pct = (v, total) => `${(v / total) * 100}%`;

export default function AnimatedLogo({ variant = "reverse", className = "", alt, src, ...imgProps }) {
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef(null);
  const flatRef = useRef(null);
  const canvasRef = useRef(null);
  const heartsRef = useRef(null);
  const rig = useRef(null); // the built WebGL puppet, or null
  const timer = useRef(null);
  const turn = useRef(0);
  const busy = useRef(false);

  const visible = () => {
    const el = rootRef.current;
    return Boolean(el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
  };

  const play = useCallback(async (name) => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (!rig.current) rig.current = await buildRig(canvasRef.current, variant);
      if (!rig.current) return;
      await runTrick(rig.current, name, flatRef.current, canvasRef.current, heartsRef.current);
    } catch (error) {
      console.warn("logo animation skipped", error);
      rig.current = null;
    } finally {
      busy.current = false;
    }
  }, [src, variant]);

  const schedule = useCallback((delay) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(function fire() {
      if (document.hidden) {
        // Save it for when someone is looking.
        const onVisible = () => {
          if (document.hidden) return;
          document.removeEventListener("visibilitychange", onVisible);
          timer.current = window.setTimeout(fire, 1200);
        };
        document.addEventListener("visibilitychange", onVisible);
        return;
      }
      if (reducedMotion() || !visible() || !canvasRef.current) {
        schedule(isDemo() ? 1500 : randomWait());
        return;
      }
      const mode = new URLSearchParams(window.location.search).get("logo-fun");
      if (mode === "still") return void play("still"); // review: show the copy at rest, to compare
      const name = isDemo() ? ORDER[turn.current++ % ORDER.length] : ORDER[Math.floor(Math.random() * ORDER.length)];
      play(name).finally(() => schedule(isDemo() ? 1800 : randomWait()));
    }, delay);
  }, [play]);

  useEffect(() => {
    if (reducedMotion()) return undefined;
    // Mount the hidden canvas after the page has settled, then build the
    // puppet in idle time so the first trick starts instantly.
    const idle = (fn, timeout) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout }) : window.setTimeout(fn, 2000));
    const id = idle(() => {
      setMounted(true);
      idle(async () => {
        if (!rig.current && visible() && canvasRef.current) {
          rig.current = await buildRig(canvasRef.current, variant).catch(() => null);
        }
      }, 6000);
    }, 4000);
    schedule(isDemo() ? 2500 : randomWait());
    return () => {
      window.clearTimeout(timer.current);
      if (window.cancelIdleCallback) window.cancelIdleCallback(id);
      rig.current?.dispose();
      rig.current = null;
    };
  }, [schedule, src, variant]);

  return (
    <span ref={rootRef} className={`logo-fun logo-fun-${variant} ${className}`}>
      <img ref={flatRef} className="logo-fun-flat" src={src} alt={alt} {...imgProps} />
      {mounted && (
        <span className="logo-fun-stage" aria-hidden="true">
          {/* The lettering stays the logo image itself; only the dogs are drawn. */}
          <img className="logo-fun-words" src={src} alt="" style={{ clipPath: `inset(0 0 0 ${pct(WORDS_X, LOGO_W)})` }} />
          <canvas ref={canvasRef} width={LOGO_W} height={LOGO_H} />
          <span ref={heartsRef}>
            {[0, 1].map((i) => (
              <svg key={i} className="logo-fun-heart" viewBox="0 0 24 22" style={{ width: pct(i ? 46 : 60, LOGO_W) }}>
                <path d="M12 21 2.6 11.6a5.6 5.6 0 0 1 7.9-7.9L12 5.2l1.5-1.5a5.6 5.6 0 0 1 7.9 7.9Z"
                  fill="#a78440" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}

// ---------- WebGL puppet ----------

const loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => img.decode().then(() => resolve(img), () => resolve(img));
  img.onerror = reject;
  img.src = url;
});

function alphaOf(img) {
  const c = document.createElement("canvas");
  c.width = LOGO_W;
  c.height = LOGO_H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, LOGO_W, LOGO_H).data;
  const alpha = new Uint8ClampedArray(LOGO_W * LOGO_H);
  for (let i = 0; i < alpha.length; i += 1) alpha[i] = data[i * 4 + 3];
  return alpha;
}

async function buildRig(canvas, variant) {
  if (!canvas) return null;
  // WebGL 2: two passes, the full-resolution scene and its filtered downscale.
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  const [golden, lab] = await Promise.all([
    loadImage(`/logo-parts/goldenfull-${variant}.png`),
    loadImage(`/logo-parts/lab-${variant}.png`),
  ]);

  // The Lab's tail, drawn at rest (tucked inside its body) in the Lab's colour.
  const tailCanvas = document.createElement("canvas");
  tailCanvas.width = LOGO_W;
  tailCanvas.height = LOGO_H;
  drawLabTail(tailCanvas.getContext("2d"), variant === "reverse" ? "#ffffff" : "#0d0d0d");

  const compile = (vs, fs) => {
    const shader = (type, source) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    return program;
  };
  // Pass 1: the scene at the logo's own resolution (logo pixels in, exact texels out at rest).
  const sceneProgram = compile(
    `#version 300 es
    in vec2 a_pos; in vec2 a_uv; out highp vec2 v_uv;
    void main() { v_uv = a_uv; gl_Position = vec4(a_pos.x / ${LOGO_W}.0 * 2.0 - 1.0, 1.0 - a_pos.y / ${LOGO_H}.0 * 2.0, 0.0, 1.0); }`,
    `#version 300 es
    precision highp float; in highp vec2 v_uv; uniform sampler2D u_tex; out vec4 o;
    void main() { o = texture(u_tex, v_uv); }`,
  );
  // Pass 2: that scene, filtered down to the canvas's real device pixels.
  const presentProgram = compile(
    `#version 300 es
    in vec2 a_pos; out highp vec2 v_uv;
    void main() { v_uv = a_pos; gl_Position = vec4(a_pos * 2.0 - 1.0, 0.0, 1.0); }`,
    // Area filter: average an n × n grid (n up to 6, by how much it shrinks) across each device
    // pixel's footprint in the full-resolution scene (close to the browser's
    // own high-quality image downscale).
    `#version 300 es
    precision highp float; in highp vec2 v_uv; uniform sampler2D u_tex; uniform vec2 u_foot; uniform int u_n; out vec4 o;
    void main() {
      vec4 sum = vec4(0.0);
      float n = float(u_n);
      for (int j = 0; j < 6; j++) {
        if (j >= u_n) break;
        for (int i = 0; i < 6; i++) {
          if (i >= u_n) break;
          vec2 off = (vec2(float(i), float(j)) + 0.5) / n - 0.5;
          sum += textureLod(u_tex, v_uv + off * u_foot, 0.0);
        }
      }
      o = sum / (n * n);
    }`,
  );
  const uFoot = gl.getUniformLocation(presentProgram, "u_foot");
  const uN = gl.getUniformLocation(presentProgram, "u_n");
  const aPos = gl.getAttribLocation(sceneProgram, "a_pos");
  const aUv = gl.getAttribLocation(sceneProgram, "a_uv");
  const pPos = gl.getAttribLocation(presentProgram, "a_pos");

  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  const texture = (source) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };

  // Full-resolution render target.
  const sceneTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, sceneTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, LOGO_W, LOGO_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);

  const piece = (mesh, tex) => {
    const pos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pos);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.rest, gl.DYNAMIC_DRAW);
    const uv = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uv);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.uv, gl.STATIC_DRAW);
    const idx = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.index, gl.STATIC_DRAW);
    return { mesh, tex, pos, uv, idx, live: new Float32Array(mesh.rest) };
  };

  const goldenMesh = gridMesh(alphaOf(golden));
  const labMesh = gridMesh(alphaOf(lab));
  const tail = tailMesh();
  const pieces = {
    golden: piece(goldenMesh, texture(golden)),
    labTail: piece(tail, texture(tailCanvas)),
    lab: piece(labMesh, texture(lab)),
  };
  const weights = { golden: weightsFor("golden", goldenMesh.rest), lab: weightsFor("lab", labMesh.rest) };

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const draw = (p) => {
    gl.bindTexture(gl.TEXTURE_2D, p.tex);
    gl.bindBuffer(gl.ARRAY_BUFFER, p.pos);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, p.live);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, p.uv);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.idx);
    gl.drawElements(gl.TRIANGLES, p.mesh.index.length, gl.UNSIGNED_SHORT, 0);
  };

  /** Keeps the canvas at the element's real device-pixel size, so the browser never rescales it. */
  const fit = () => {
    const ratio = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const h = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  /** Draws a pose; returns where the muzzles are, for the hearts. */
  const render = (pose = {}) => {
    const g = boneMatrices("golden", pose.golden);
    const l = boneMatrices("lab", pose.lab);
    skin(pieces.golden.live, goldenMesh.rest, weights.golden, g);
    skin(pieces.lab.live, labMesh.rest, weights.lab, l);
    skinLabTail(pieces.labTail.live, tail, l, pose.labTail?.swing || 0, pose.labTail?.bend || 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, LOGO_W, LOGO_H);
    gl.useProgram(sceneProgram);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    draw(pieces.golden);
    draw(pieces.labTail);
    draw(pieces.lab);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    fit();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(presentProgram);
    gl.uniform2f(uFoot, 1 / canvas.width, 1 / canvas.height);
    gl.uniform1i(uN, Math.max(2, Math.min(6, Math.ceil((2 * LOGO_W) / canvas.width))));
    gl.disable(gl.BLEND);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(pPos);
    gl.vertexAttribPointer(pPos, 2, gl.FLOAT, false, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.BLEND);

    const gm = muzzleAt("golden", g);
    const lm = muzzleAt("lab", l);
    return { golden: gm, lab: lm, between: [(gm[0] + lm[0]) / 2 + 30, 175] };
  };

  render(); // warm up: the first draw compiles everything
  return {
    render,
    dispose() {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

async function runTrick(rig, name, flat, canvas, hearts) {
  const trick = TRICKS[name] || { duration: 0, pose: () => ({}) };
  const who = Math.random() < 0.5 ? "golden" : "lab";
  const heartPlan = trick.hearts ? trick.hearts(who) : [];
  const heartEls = hearts ? [...hearts.children] : [];
  const stage = canvas.parentElement;

  // In one frame: draw the rest pose and swap it in for the static logo.
  await frame();
  rig.render();
  stage.style.visibility = "visible";
  flat.style.visibility = "hidden";
  if (name === "still") return; // review mode: stay on the copy, at rest

  const start = performance.now();
  for (;;) {
    await frame();
    const t = (performance.now() - start) / 1000;
    const done = t >= trick.duration;
    const spots = rig.render(done ? {} : trick.pose(t, who));
    heartPlan.forEach((h, i) => {
      const el = heartEls[i];
      if (!el) return;
      const life = 1.7;
      const k = (t - h.t0) / life;
      if (k <= 0 || k >= 1 || done) {
        el.style.opacity = "0";
        return;
      }
      if (!h.at) h.at = h.between ? spots.between : spots[h.from];
      const [x, y] = h.at;
      const drift = h.between ? 0 : h.from === "golden" ? -18 : 18;
      const pop = k < 0.15 ? 0.3 + (k / 0.15) * 0.95 : k < 0.28 ? 1.25 - ((k - 0.15) / 0.13) * 0.25 : 1 - (k - 0.28) * 0.15;
      el.style.left = pct(x + drift * k + 6 * Math.sin(k * 9), LOGO_W);
      el.style.top = pct(y - 30 - 95 * k, LOGO_H);
      el.style.opacity = String(k < 0.12 ? k / 0.12 : k > 0.7 ? (1 - k) / 0.3 : 1);
      el.style.transform = `translate(-50%, -50%) scale(${(h.small ? 0.8 : 1) * pop})`;
    });
    if (done) break;
  }
  // Same frame as the final rest pose: swap the static logo back in.
  flat.style.visibility = "";
  stage.style.visibility = "hidden";
}
