// SendEase — Google Apps Script Backend
// ─────────────────────────────────────
// SETUP (one time only):
// 1. script.google.com → New Project → paste this code → Save (Ctrl+S)
// 2. Deploy → New Deployment → Web App
//    Execute as: Me | Who has access: Anyone → Deploy
// 3. Authorize → Allow
// 4. Copy Web App URL → paste in SendEase app

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'ping') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      email: Session.getActiveUser().getEmail(),
      message: 'SendEase connected!'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : '{}';
    var payload = JSON.parse(raw);
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
 function sendEmails(payload) {
  var records = payload.records || [];
  if (!records.length) return { status:'error', message:'No records' };
  var results = [];
  var sent = 0, failed = 0;
  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    if (!rec.email || rec.email.indexOf('@') < 0) {
      results.push({ email:rec.email, name:rec.name, status:'skip', reason:'Invalid email' });
      continue;
    }
    try {
      var options = { name: rec.senderName || 'SendEase' };
      if (rec.attachments && rec.attachments.length > 0) {
        var blobs = [];
        for (var j = 0; j < rec.attachments.length; j++) {
          var att = rec.attachments[j];
          var decoded = Utilities.base64Decode(att.base64);
          var blob = Utilities.newBlob(decoded, att.type || 'application/octet-stream', att.name);
          blobs.push(blob);
        }
        options.attachments = blobs;
      }
      GmailApp.sendEmail(rec.email, rec.subject, rec.body, options);
      results.push({ email:rec.email, name:rec.name, status:'sent' });
      sent++;
      if (i < records.length - 1) Utilities.sleep(400);
    } catch(err) {
      results.push({ email:rec.email, name:rec.name, status:'failed', reason:err.toString() });
      failed++;
    }
  }
  return { status:'ok', results:results, summary:{ sent:sent, failed:failed, total:records.length } };
}
