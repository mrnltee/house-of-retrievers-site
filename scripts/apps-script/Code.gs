/**
 * House of Retrievers — join form intake.
 *
 * Receives submissions from `app/api/join/route.js` and appends them to a
 * Google Sheet. The Next.js route holds JOIN_FORM_SECRET server-side and sends
 * it in the request body, so this script must check it before writing.
 *
 * Setup (once):
 *   1. Extensions -> Apps Script from the target spreadsheet, or set SHEET_ID below.
 *   2. Project Settings -> Script properties, add:
 *        JOIN_FORM_SECRET  = the same value stored in Vercel
 *   3. Deploy -> New deployment -> Web app
 *        Execute as:      Me
 *        Who has access:  Anyone
 *   4. Copy the /exec URL into the Vercel env var GOOGLE_APPS_SCRIPT_URL.
 *
 * After ANY edit to this file you must publish a new version, or /exec keeps
 * running the old code:
 *   Deploy -> Manage deployments -> (pencil) -> Version: New version -> Deploy
 * That keeps the same /exec URL. Creating a *new deployment* instead mints a
 * new URL, which then has to be updated in Vercel.
 */

/** Leave blank when this script is bound to the spreadsheet itself. */
var SHEET_ID = "";

/** Tab the submissions are appended to. Created automatically if missing. */
var SHEET_NAME = "Join submissions";

var HEADERS = [
  "Submitted at",
  "Interest",
  "Name",
  "Email",
  "Profile",
  "Retriever name",
  "Message",
  "Source",
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: "Empty request body" });
    }

    var body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return jsonResponse({ ok: false, error: "Body was not valid JSON" });
    }

    var expected = PropertiesService.getScriptProperties().getProperty("JOIN_FORM_SECRET");
    if (!expected) {
      return jsonResponse({ ok: false, error: "Script property JOIN_FORM_SECRET is not set" });
    }
    if (!secretsMatch(String(body.secret || ""), expected)) {
      return jsonResponse({ ok: false, error: "Unauthorized" });
    }

    appendSubmission(body);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}

/**
 * A plain health check. Without this, opening the /exec URL in a browser shows
 * "Script function not found: doGet", which looks like a broken deployment.
 * It deliberately reveals nothing about the sheet or the secret.
 */
function doGet() {
  return jsonResponse({ ok: true, service: "house-of-retrievers-join" });
}

function appendSubmission(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet();
    sheet.appendRow([
      body.submittedAt || new Date().toISOString(),
      body.interest || "",
      body.name || "",
      body.email || "",
      body.profile || "",
      body.dogName || "",
      body.message || "",
      body.source || "",
    ]);
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  var spreadsheet = SHEET_ID
    ? SpreadsheetApp.openById(SHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error("No spreadsheet found. Set SHEET_ID or bind the script to a sheet.");
  }

  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

/** Length-independent comparison so the response time does not leak the secret. */
function secretsMatch(received, expected) {
  if (received.length !== expected.length) return false;
  var mismatch = 0;
  for (var i = 0; i < expected.length; i++) {
    mismatch |= received.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
