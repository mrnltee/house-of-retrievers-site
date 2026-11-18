"use client";

import HowTo from "./HowTo";
import { WELCOME_GUIDES } from "../../lib/admin/howToGuides.mjs";

const closeFilm = () => document.querySelector("dialog.howto-dialog.is-film[open]")?.close();

/**
 * The welcome film (owner, 18 Nov 2026): one event from start to finish, opened once per browser the first
 * time someone uses the admin (`auto`), and again from Getting started. It ends on a card that hands over to
 * the menu tour ("Show me around") or lets them start.
 */
export default function WelcomeFilm({ auto = false, label = "Watch the 30-second tour", className = "btn ghost" }) {
  return (
    <HowTo
      guide={WELCOME_GUIDES[0]}
      guides={WELCOME_GUIDES}
      heading="Welcome to the HoR admin"
      label={label}
      className={className}
      hideButton={auto}
      autoOpen={auto ? "hor-welcome-film" : ""}
      ending={{
        title: "That's an event, start to finish.",
        text: "Your menu shows only the pages you can use. Want a quick look around it?",
        actions: (
          <>
            <button type="button" className="btn gold" data-confirm="not-needed-read-only" onClick={() => { closeFilm(); window.dispatchEvent(new Event("hor-guide-start")); }}>Show me around</button>
            <button type="button" className="btn ghost" data-confirm="not-needed-read-only" onClick={closeFilm}>Start using the admin</button>
          </>
        ),
      }}
    />
  );
}
