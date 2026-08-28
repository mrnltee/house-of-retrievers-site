import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTERESTS = ["Member", "Volunteer", "Partner"];
const LIMITS = { name: 120, email: 200, profile: 300, dogName: 120, message: 2000 };

const noStore = { "Cache-Control": "no-store" };

const clean = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export async function POST(request) {
  const endpoint = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.JOIN_FORM_SECRET;

  if (!endpoint || !secret) {
    return NextResponse.json(
      { error: "The join form is not configured yet." },
      { status: 503, headers: noStore },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: noStore });
  }

  const name = clean(body?.name, LIMITS.name);
  const email = clean(body?.email, LIMITS.email);
  const interest = INTERESTS.includes(body?.interest) ? body.interest : INTERESTS[0];

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter your name and a valid email address." },
      { status: 422, headers: noStore },
    );
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
      socialProfile: clean(body?.profile, LIMITS.profile),
      retrieverName: clean(body?.dogName, LIMITS.dogName),
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
        { error: "We could not record your request. Please try again." },
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
        { error: "We could not record your request. Please try again." },
        { status: 502, headers: noStore },
      );
    }

    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch {
    return NextResponse.json(
      { error: "The join form is temporarily unavailable. Please try again." },
      { status: 502, headers: noStore },
    );
  }
}
