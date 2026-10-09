"use client";

import jsQR from "jsqr";
import { useState } from "react";

const MAX_BYTES = 300 * 1024;

/** Reads a QR image in the browser, checks it scans, and fills hidden fields for the form. */
export default function QrPicker({ name, current }) {
  const [image, setImage] = useState("");
  const [payload, setPayload] = useState("");
  const [message, setMessage] = useState("");

  async function onChange(event) {
    const file = event.target.files?.[0];
    setImage(""); setPayload(""); setMessage("");
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setMessage("Use a PNG, JPG or WebP image.");
    if (file.size > MAX_BYTES) return setMessage("That image is over 300 KB. A screenshot of just the QR is enough.");
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const found = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    if (!found?.data) return setMessage("That image doesn't scan as a QR code. Try a sharper screenshot.");
    setImage(dataUrl);
    setPayload(found.data);
    setMessage("Scans as a QR code. The approver sees exactly what it decodes to.");
  }

  return (
    <div className="form" style={{ gap: 8 }}>
      <div className="qr-slot">{image || current ? <img src={image || current} alt={`${name} QR code${image ? " (new)" : " (current)"}`} /> : "No QR yet"}</div>
      <label className="field">
        <span>{current ? "Replace QR image" : "QR image"} <small>PNG, JPG or WebP, under 300 KB</small></span>
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onChange} />
      </label>
      <input type="hidden" name="qrImage" value={image} />
      <input type="hidden" name="qrPayload" value={payload} />
      {message && <p className="small" role="status">{message}</p>}
    </div>
  );
}
