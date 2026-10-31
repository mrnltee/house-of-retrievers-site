"use client";

import { useRef } from "react";
import { letterBlocks } from "../../../lib/letters.mjs";
import { TEXT_WIDTH_PT } from "../../../lib/letterSignature.mjs";

/** **bold** runs, with any blank still in [brackets] highlighted. */
function Runs({ runs }) {
  return runs.map((run, i) => {
    const parts = run.text.split(/(\[[^\]\n]+\])/g);
    const inner = parts.map((part, j) => (/^\[[^\]]+\]$/.test(part) ? <mark key={j} className="letter-blank">{part}</mark> : part));
    return run.bold ? <strong key={i}>{inner}</strong> : <span key={i}>{inner}</span>;
  });
}

/**
 * The letter on screen, laid out like the PDF (logo, paragraphs, tables, page
 * breaks). `text` is already filled in; unfilled blanks show highlighted.
 */
export default function LetterPreview({ text, signature = null, onMoveSignature }) {
  const blocks = letterBlocks(text);
  return (
    <div className="letter-paper">
      <img className="letter-logo" src="/house-of-retrievers-logo-original.png" alt="The House of Retrievers’ Society, Inc." />
      {blocks.map((b, i) => {
        if (b.type === "page") return <hr key={i} className="letter-page" aria-label="New page" />;
        if (b.type === "signature") return <SignatureMark key={i} signature={signature} onMove={onMoveSignature} />;
        if (b.type === "h1") return <h3 key={i} className="letter-h1"><Runs runs={b.runs} /></h3>;
        if (b.type === "h2") return <h4 key={i} className="letter-h2"><Runs runs={b.runs} /></h4>;
        if (b.type === "bullet") return <p key={i} className="letter-bullet">• <Runs runs={b.runs} /></p>;
        if (b.type === "center") return <p key={i} style={{ textAlign: "center" }}><Runs runs={b.runs} /></p>;
        if (b.type === "table") {
          return (
            <div key={i} className="table-wrap">
              <table className="letter-table">
                <tbody>
                  {b.rows.map((row, r) => (
                    <tr key={r} className={row.header ? "is-head" : undefined}>
                      {row.cells.map((cell, c) => (row.header ? <th key={c}><Runs runs={cell} /></th> : <td key={c}><Runs runs={cell} /></td>))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <p key={i}><Runs runs={b.runs} /></p>;
      })}
    </div>
  );
}

/**
 * Where the signature sits: a zero-height spot at the {signature} line with the
 * image laid on top, placed like the PDF (x share of the text width, dy and
 * width in points). Drag it to move it when `onMove` is given.
 */
function SignatureMark({ signature, onMove }) {
  const box = useRef(null);
  if (!signature?.on) return onMove ? <p className="letter-sign-off small">Signature goes here (switched off)</p> : null;
  if (!signature.src) return <p className="letter-sign-off small">Signature goes here: add its image</p>;
  function start(e) {
    if (!onMove) return;
    e.preventDefault();
    const el = box.current;
    const perPt = el.offsetWidth / TEXT_WIDTH_PT;
    const from = { x: e.clientX, y: e.clientY, sx: signature.x, sdy: signature.dy };
    const move = (ev) => onMove({ x: from.sx + (ev.clientX - from.x) / el.offsetWidth, dy: from.sdy + (ev.clientY - from.y) / perPt });
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }
  return (
    <div ref={box} className="letter-sign-spot">
      <img
        src={signature.src}
        alt="Signature"
        className={`letter-sign${onMove ? " is-movable" : ""}`}
        draggable={false}
        onPointerDown={start}
        style={{ left: `${signature.x * 100}%`, top: `calc(${signature.dy} * var(--pt, 1.33px))`, width: `${(signature.width / TEXT_WIDTH_PT) * 100}%` }}
        title={onMove ? "Drag to move the signature" : undefined}
      />
    </div>
  );
}

