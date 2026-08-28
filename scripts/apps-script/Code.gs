/**
 * House of Retrievers — join form intake.
 *
 * Mirror of the Google Apps Script deployed behind GOOGLE_APPS_SCRIPT_URL.
 * Kept here for version history; editing this file alone changes nothing.
 * To ship a change: paste into the Apps Script editor, then
 *   Deploy -> Manage deployments -> (pencil) -> Version: New version -> Deploy
 * That keeps the same /exec URL. A *new deployment* mints a new URL, which
 * then has to be updated in Vercel.
 *
 * Reads a payload shaped by app/api/join/route.js:
 *   { secret, submission: { joinType, name, email, socialProfile,
 *                           retrieverName, message } }
 * Renaming a field here means renaming it there too.
 *
 * Script properties used:
 *   JOIN_FORM_SECRET   required, must match the Vercel value
 *   SHEET_ID           required, the id from the spreadsheet URL between /d/ and /edit
 *   NOTIFICATION_EMAIL optional, sends an alert per submission
 */

const SHEET_NAME = 'Applications';

function doPost(e) {
  try {
    const body = JSON.parse(e?.postData?.contents || '{}');
    const properties = PropertiesService.getScriptProperties();

    if (body.secret !== properties.getProperty('JOIN_FORM_SECRET')) {
      return response({ ok: false, error: 'Unauthorized' });
    }

    const form = body.submission || {};
    const joinType = clean(form.joinType, 40);
    const name = clean(form.name, 120);
    const email = clean(form.email, 254);
    const socialProfile = clean(form.socialProfile, 300);
    const furbabyName = clean(form.retrieverName, 120);
    const message = clean(form.message, 2000);

    if (!['Member', 'Volunteer', 'Partner'].includes(joinType)) {
      return response({ ok: false, error: 'Select a join type.' });
    }

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response({
        ok: false,
        error: 'Name and a valid email are required.'
      });
    }

    const spreadsheetId = properties.getProperty('SHEET_ID');

    if (!spreadsheetId) {
      return response({
        ok: false,
        error: 'Script property SHEET_ID is not set.'
      });
    }

    const sheet = SpreadsheetApp
      .openById(spreadsheetId)
      .getSheetByName(SHEET_NAME);

    if (!sheet) throw new Error(`Missing sheet: ${SHEET_NAME}`);

    sheet.appendRow([
      new Date(),
      joinType,
      name,
      email,
      socialProfile,
      furbabyName,
      message,
      'New'
    ]);

    const recipient = properties.getProperty('NOTIFICATION_EMAIL');

    if (recipient) {
      MailApp.sendEmail({
        to: recipient,
        subject: `New ${joinType} application — ${name}`,
        htmlBody: `
          <p><strong>Join type:</strong> ${escapeHtml(joinType)}</p>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Social profile:</strong> ${escapeHtml(socialProfile || '—')}</p>
          <p><strong>Furbaby name:</strong> ${escapeHtml(furbabyName || '—')}</p>
          <p><strong>Message:</strong><br>
          ${escapeHtml(message || '—').replace(/\n/g, '<br>')}</p>
        `
      });
    }

    return response({ ok: true });
  } catch (error) {
    console.error(error);
    return response({
      ok: false,
      error: 'Could not save the application.'
    });
  }
}

/**
 * Health check. Without this, opening the /exec URL in a browser shows
 * "Script function not found: doGet", which looks like a broken deployment.
 * Deliberately reveals nothing about the sheet or the secret.
 */
function doGet() {
  return response({ ok: true, service: 'house-of-retrievers-join' });
}

function clean(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function response(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}