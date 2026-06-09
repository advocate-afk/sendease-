// SendEase — Google Apps Script Backend
// ─────────────────────────────────────
// SETUP (one time only):
// 1. Go to script.google.com → New Project → paste this entire file → Save (Ctrl+S)
// 2. Click Deploy → New Deployment → Type: Web App
//    Execute as: Me | Who has access: Anyone → Deploy
// 3. Copy the Web App URL → paste in SendEase app

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'ping') {
    var result = JSON.stringify({
      status: 'ok',
      email: Session.getActiveUser().getEmail(),
      message: 'SendEase connected!'
    });
    return ContentService.createTextOutput(result)
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var result;
    if (payload.action === 'send') {
      result = sendEmails(payload);
    } else {
      result = { status: 'error', message: 'Unknown action' };
    }
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function sendEmails(payload) {
  var records = payload.records;
  var results = [];
  var sent = 0, failed = 0, skipped = 0;

  for (var i = 0; i < records.length; i++) {
    var rec = records[i];

    if (!rec.email || rec.email.indexOf('@') < 0) {
      results.push({ email: rec.email, status: 'skip', reason: 'Invalid email' });
      skipped++;
      continue;
    }

    try {
      var attachments = [];
      if (rec.attachments && rec.attachments.length > 0) {
        for (var j = 0; j < rec.attachments.length; j++) {
          var f = rec.attachments[j];
          var bytes = Utilities.base64Decode(f.base64);
          var blob = Utilities.newBlob(bytes, f.type || 'application/octet-stream', f.name);
          attachments.push(blob);
        }
      }

      var options = { name: rec.senderName || 'SendEase' };
      if (attachments.length > 0) options.attachments = attachments;
      if (rec.htmlBody) options.htmlBody = rec.body;

      GmailApp.sendEmail(rec.email, rec.subject, rec.body, options);
      results.push({ email: rec.email, name: rec.name, status: 'sent' });
      sent++;

      if (i < records.length - 1) Utilities.sleep(400);

    } catch (err) {
      results.push({ email: rec.email, name: rec.name, status: 'failed', reason: err.toString() });
      failed++;
    }
  }

  return {
    status: 'ok',
    summary: { sent: sent, failed: failed, skipped: skipped, total: records.length },
    results: results
  };
}
