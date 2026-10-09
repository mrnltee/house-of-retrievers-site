"use client";

import { useCallback, useEffect, useRef } from "react";

/** The event card shows photos at 16:10, so the crop is fixed to that. */
export const CROP_RATIO = 16 / 10;
export const MAX_ZOOM = 4;

/** The crop that shows as much of the photo as fits at 16:10, centred. */
export function initialCrop(bitmap) {
  return { zoom: 1, cx: bitmap.width / 2, cy: bitmap.height / 2 };
}

/** Width and height of the crop rectangle in source pixels. */
export function cropSize(bitmap, zoom) {
  const baseW = Math.min(bitmap.width, bitmap.height * CROP_RATIO);
  const w = baseW / zoom;
  return { w, h: w / CROP_RATIO };
}

/** Keep the zoom in range and the crop rectangle inside the photo. */
export function clampCrop(bitmap, crop) {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, crop.zoom));
  const { w, h } = cropSize(bitmap, zoom);
  const cx = Math.min(bitmap.width - w / 2, Math.max(w / 2, crop.cx));
  const cy = Math.min(bitmap.height - h / 2, Math.max(h / 2, crop.cy));
  return { zoom, cx, cy };
}

/** Draw the cropped region onto a canvas of the given size. */
export function drawCrop(canvas, bitmap, crop, width) {
  const { w, h } = cropSize(bitmap, crop.zoom);
  canvas.width = Math.round(width);
  canvas.height = Math.round(width / CROP_RATIO);
  const context = canvas.getContext("2d");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, crop.cx - w / 2, crop.cy - h / 2, w, h, 0, 0, canvas.width, canvas.height);
}

/**
 * Drag (or arrow keys) to move the photo inside a 16:10 frame; zoom with the
 * slider, the mouse wheel, a pinch, or the + and - keys. What is inside the
 * frame is exactly what the event card shows.
 */
export default function PhotoCropper({ bitmap, crop, onChange }) {
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const latest = useRef(crop);
  latest.current = crop;

  const update = useCallback((next) => onChange(clampCrop(bitmap, next)), [bitmap, onChange]);

  // Redraw whenever the crop or the frame size changes.
  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return undefined;
    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      drawCrop(canvas, bitmap, latest.current, frame.clientWidth * ratio);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [bitmap, crop]);

  /** Source pixels per on-screen pixel at the current zoom. */
  const scale = () => cropSize(bitmap, latest.current.zoom).w / (frameRef.current?.clientWidth || 1);

  // The wheel listener has to be non-passive to stop the page scrolling.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const onWheel = (event) => {
      event.preventDefault();
      const c = latest.current;
      update({ ...c, zoom: c.zoom * Math.exp(-event.deltaY * 0.0015) });
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [update]);

  function onPointerDown(event) {
    frameRef.current.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: latest.current.zoom };
    }
  }

  function onPointerMove(event) {
    const before = pointers.current.get(event.pointerId);
    if (!before) return;
    const now = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, now);
    const c = latest.current;
    if (pointers.current.size === 1) {
      // Dragging the photo right shows more of its left side.
      const s = scale();
      update({ ...c, cx: c.cx - (now.x - before.x) * s, cy: c.cy - (now.y - before.y) * s });
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      update({ ...c, zoom: pinch.current.zoom * (distance / pinch.current.distance) });
    }
  }

  function onPointerUp(event) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  function onKeyDown(event) {
    const c = latest.current;
    const { w } = cropSize(bitmap, c.zoom);
    const step = w * (event.shiftKey ? 0.1 : 0.02);
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[event.key]) {
      event.preventDefault();
      // Arrow keys move the photo, matching what dragging does.
      update({ ...c, cx: c.cx - moves[event.key][0], cy: c.cy - moves[event.key][1] });
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      update({ ...c, zoom: c.zoom * 1.1 });
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      update({ ...c, zoom: c.zoom / 1.1 });
    }
  }

  return (
    <div className="form" style={{ gap: 10 }}>
      <div
        ref={frameRef}
        className="photo-crop"
        tabIndex={0}
        role="group"
        aria-label="Photo framing. Drag or use the arrow keys to move the photo; plus and minus to zoom."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <canvas ref={canvasRef} aria-hidden="true" />
        <span className="photo-crop-grid" aria-hidden="true" />
      </div>
      <label className="field photo-zoom">
        <span>Zoom</span>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={crop.zoom}
          onChange={(event) => update({ ...crop, zoom: Number(event.target.value) })}
        />
      </label>
    </div>
  );
}
