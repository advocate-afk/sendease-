// SendEase — Google Apps Script Backend
// Deploy: Deploy → New Deployment → Web App
// Execute as: Me | Who has access: Anyone

function setCors(output) {
  return output.setMimeType(ContentService.MimeType.JSON)
    .addHeader('Access-Control-Allow-Origin', '*')
    .addHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    .addHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'ping') {
    return setCors(ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      email: Session.getActiveUser().getEmail(),
      message: 'SendEase backend is live!'
    })));
  }
  return setCors(ContentService.createTextOutput(JSON.stringify({ status: 'ok' })));
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    if (payload.action === 'send') {
      return setCors(ContentService.createTextOutput(JSON.stringify(sendEmails(payload))));
    }
    return setCors(ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' })));
  } catch (err) {
    return setCors(ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })));
  }
}

function sendEmails(payload) {
  var records = payload.records;
  var results = [], sent = 0, failed = 0, skipped = 0;

  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    if (!rec.email || rec.email.indexOf('@') < 0) {
      results.push({ pan: rec.pan, email: rec.email, status: 'skip', reason: 'Invalid email' });
      skipped++; continue;
    }
    try {
      var attachments = (rec.pdfs || []).map(function(pdf) {
        var bytes = Utilities.base64Decode(pdf.base64);
        return Utilities.newBlob(bytes, 'application/pdf', pdf.name);
      });
      GmailApp.sendEmail(rec.email, rec.subject, rec.body, {
        name: 'HR & Payroll Team',
        attachments: attachments.length ? attachments : undefined
      });
      results.push({ pan: rec.pan, email: rec.email, name: rec.name, status: 'sent' });
      sent++;
      if (i < records.length - 1) Utilities.sleep(400);
    } catch (err) {
      results.push({ pan: rec.pan, email: rec.email, name: rec.name, status: 'failed', reason: err.toString() });
      failed++;
    }
  }
  return { status: 'ok', summary: { sent, failed, skipped, total: records.length }, results };
}
