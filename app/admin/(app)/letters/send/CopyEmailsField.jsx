"use client";

import { useRef, useState } from "react";
import { MAX_COPIES, isCopyEmail, splitCopyDraft } from "../../../../lib/letterCopies.mjs";
import Icon from "../../../../components/Icon";

/**
 * CC or BCC addresses as chips, like an event's Partners and Sponsors (owner,
 * 26 Nov 2026): a comma, semicolon, space or Enter ends an address; a pasted
 * list splits into chips; Backspace in an empty box removes the last one.
 * A chip that isn't an email shows red. The form still posts one text value,
 * "a@x.ph, b@y.com", under `name`, so the server's parseCopies is unchanged.
<<<<<<< HEAD
 * `onChange` gets { chips, draft }: the finished addresses and what's still being typed.
=======
 * `onChange` gets that same text, including what's still being typed.
>>>>>>> origin/claude/gallant-euler-yy6odg
 */
export default function CopyEmailsField({ name, label, hint, invalid = false, onChange }) {
  const [chips, setChips] = useState([]);
  const [draft, setDraft] = useState("");
  const input = useRef(null);
  const full = chips.length >= MAX_COPIES;
  const id = `${name}-input`;

  function update(nextChips, nextDraft) {
    setChips(nextChips);
    setDraft(nextDraft);
<<<<<<< HEAD
    onChange?.({ chips: nextChips, draft: nextDraft });
=======
    onChange?.([...nextChips, nextDraft.trim()].filter(Boolean).join(", "));
>>>>>>> origin/claude/gallant-euler-yy6odg
  }

  // Typing or pasting: finished addresses become chips, the rest stays typed.
  function type(text) {
    const next = splitCopyDraft(chips, text);
    update(next.chips, next.draft);
  }

  // Enter or leaving the box finishes the address being typed.
  function commit() {
    if (draft.trim()) type(`${draft},`);
  }

  const value = [...chips, draft.trim()].filter(Boolean).join(", ");

  return (
    <div className="field">
      <label htmlFor={id}>{label} <small>{hint}</small></label>
      <div className="tag-input copy-emails" onClick={() => input.current?.focus()} aria-invalid={invalid || undefined}>
        {chips.map((c) => {
          const bad = !isCopyEmail(c);
          return (
            <span key={c} className={`tag-badge${bad ? " is-bad" : ""}`} title={bad ? "This doesn't look like an email address" : undefined}>
              {c}{bad && <span className="visually-hidden"> (not an email address)</span>}
              <button type="button" onClick={(e) => { e.stopPropagation(); update(chips.filter((x) => x !== c), draft); input.current?.focus(); }} aria-label={`Remove ${c}`}><Icon name="close" /></button>
            </span>
          );
        })}
        {!full && (
          <input
            id={id}
            ref={input}
            type="text"
            inputMode="email"
            value={draft}
            placeholder={chips.length ? "Add another" : "name@example.com"}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={invalid || undefined}
            onChange={(e) => type(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Backspace" && !draft && chips.length) {
                e.preventDefault();
                update(chips.slice(0, -1), "");
              }
            }}
            onBlur={commit}
          />
        )}
      </div>
      <input type="hidden" name={name} value={value} />
      <p className="small muted">{full ? `That's the most for one send (${MAX_COPIES}).` : "Type a comma or press Enter after each address."}</p>
    </div>
  );
}
