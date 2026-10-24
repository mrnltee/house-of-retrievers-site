"use client";

import { letterBlocks } from "../../../lib/letters.mjs";

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
export default function LetterPreview({ text }) {
  const blocks = letterBlocks(text);
  return (
    <div className="letter-paper">
      <img className="letter-logo" src="/house-of-retrievers-logo-original.png" alt="The House of Retrievers Society Inc." />
      {blocks.map((b, i) => {
        if (b.type === "page") return <hr key={i} className="letter-page" aria-label="New page" />;
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
