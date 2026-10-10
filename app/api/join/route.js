import { NextResponse } from "next/server";
import { parseSocialProfile } from "../../lib/socialProfile";
import { hasDatabase, sql } from "../../lib/db";
import { logActivity } from "../../lib/admin/log";
import { savePersonPhoto } from "../../lib/personPhotos";
import { sendEmail } from "../../lib/email";
import { applicationReceived } from "../../lib/emailTemplates.mjs";
import { HONEYPOT_FIELD, RATE_LIMIT, checkFillTime, clientIp, createRateLimiter, isHoneypotTripped } from "../../lib/spamGuard.mjs";

// Module scope so it lives as long as the server instance. See spamGuard.mjs.
const limiter = createRateLimiter(RATE_LIMIT);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTERESTS = ["Member", "Volunteer", "Partner", "Sponsor"];
const LIMITS = { name: 120, email: 200, profile: 300, organization: 160, furbabyName: 120, message: 2000, photoName: 120 };

/** Room for a resized photo plus base64's ~33% overhead, and nothing more. */
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

const noStore = { "Cache-Control": "no-store" };

const clean = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export async function POST(request) {
  const endpoint = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.JOIN_FORM_SECRET;

  if (!endpoint || !secret) {
    return NextResponse.json(
      { error: "The join form isn’t set up yet. Please try again later." },
      { status: 503, headers: noStore },
    );
  }

  const rate = limiter.hit(clientIp(request.headers));
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "You’ve sent a few of these already. Please wait a few minutes and try again." },
      { status: 429, headers: { ...noStore, "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Something went wrong with that request." }, { status: 400, headers: noStore });
  }

  // Bots: answer as if it worked, forward nothing.
  const fillTime = checkFillTime(body?.elapsedMs);
  if (isHoneypotTripped(body?.[HONEYPOT_FIELD]) || fillTime === "too-fast") {
    return NextResponse.json({ ok: true }, { headers: noStore });
  }
  // A page loaded before this check shipped sends no timing. Tell a person
  // what to do rather than silently dropping their details.
  if (fillTime === "missing") {
    return NextResponse.json(
      { error: "Please refresh the page and send the form again." },
      { status: 400, headers: noStore },
    );
  }

  const name = clean(body?.name, LIMITS.name);
  const email = clean(body?.email, LIMITS.email);
  const interest = INTERESTS.includes(body?.interest) ? body.interest : INTERESTS[0];

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "We’ll need your name and a valid email address." },
      { status: 422, headers: noStore },
    );
  }

  // Parse here rather than in the browser: the handle decides what the sheet
  // links to, so it has to be derived somewhere a visitor cannot edit.
  const { profile: social, error: socialError } = parseSocialProfile(
    clean(body?.profile, LIMITS.profile),
    body?.socialPlatform,
  );

  if (socialError) {
    return NextResponse.json({ error: socialError }, { status: 422, headers: noStore });
  }

  // The browser resizes before uploading, so anything arriving oversized has
  // bypassed the form. Reject rather than forward it to Apps Script, which
  // stops accepting payloads at 50MB.
  const photoRaw = typeof body?.photo === "string" ? body.photo : "";
  let photo = "";

  if (photoRaw) {
    const match = photoRaw.match(PHOTO_DATA_URL);
    if (!match) {
      return NextResponse.json(
        { error: "That photo did not come through. Try another one?" },
        { status: 422, headers: noStore },
      );
    }
    if (Math.ceil((match[2].length * 3) / 4) > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: "That photo is too large. Try a smaller one?" },
        { status: 422, headers: noStore },
      );
    }
    photo = photoRaw;
  }

  // Field names and nesting are dictated by the Apps Script in
  // scripts/apps-script/Code.gs — change both together or submissions are
  // rejected as "Select a join type."
  const payload = {
    secret,
    submission: {
      joinType: interest,
      name,
      email,
      socialProfile: social ? social.display : "",
      socialUrl: social ? social.url : "",
      organization: clean(body?.organization, LIMITS.organization),
      furbabyName: clean(body?.furbabyName, LIMITS.furbabyName),
      photo,
      photoName: clean(body?.photoName, LIMITS.photoName),
      message: clean(body?.message, LIMITS.message),
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "We couldn’t save that just now. Mind trying again?" },
        { status: 502, headers: noStore },
      );
    }

    const text = await response.text();
    let result = null;
    try {
      result = JSON.parse(text);
    } catch {
      result = null;
    }

    if (result && result.ok === false) {
      return NextResponse.json(
        { error: "We couldn’t save that just now. Mind trying again?" },
        { status: 502, headers: noStore },
      );
    }

    // Also file the person in the admin's People list. Best effort: the sheet
    // already has them, so a database hiccup must not fail the visitor.
    let joined = null;
    if (hasDatabase()) {
      const s = payload.submission;
      try {
        // One record per person and kind: joining again updates it, keeps the
        // follow-up status and adds the new message under the old one.
        const [person] = await sql(
          `INSERT INTO people (kind, name, email, social_profile, social_url, organization, furbaby_name, message, membership)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $1 = 'Member' THEN 'applicant' END)
           ON CONFLICT (kind, lower(email)) DO UPDATE SET
             name = EXCLUDED.name,
             social_profile = COALESCE(EXCLUDED.social_profile, people.social_profile),
             social_url = COALESCE(EXCLUDED.social_url, people.social_url),
             organization = COALESCE(EXCLUDED.organization, people.organization),
             furbaby_name = COALESCE(EXCLUDED.furbaby_name, people.furbaby_name),
             message = CASE WHEN EXCLUDED.message IS NULL THEN people.message
                            WHEN people.message IS NULL THEN EXCLUDED.message
                            ELSE people.message || E'\n\n' || EXCLUDED.message END,
             joined_count = people.joined_count + 1,
             last_joined_at = now(),
             updated_at = now()
           RETURNING id, joined_count`,
          [s.joinType, s.name, s.email, s.socialProfile || null, s.socialUrl || null, s.organization || null, s.furbabyName || null, s.message || null],
        );
        joined = person;
        await logActivity("Join form", person.joined_count > 1 ? "person.rejoin" : "person.join", s.name, { personId: person.id, kind: s.joinType });
        if (s.photo) await savePersonPhoto(person.id, s.photo).catch(() => null);
      } catch (error) {
        console.error("join: could not add to People", error?.code || error?.message);
      }
    }

    // "We got your application", straight away. Best effort: no email setup, no email.
    const mail = applicationReceived({ name: payload.submission.name, kind: interest, again: (joined?.joined_count || 1) > 1 });
    await sendEmail({
      to: payload.submission.email,
      ...mail,
      idempotencyKey: joined ? `join/${joined.id}/${joined.joined_count}` : undefined,
    }).catch(() => null);

    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch {
    return NextResponse.json(
      { error: "The form is having a moment. Please try again shortly." },
      { status: 502, headers: noStore },
    );
  }
}
